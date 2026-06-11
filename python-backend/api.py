"""PadhAI-Dost FastAPI backend.

Production hardening over the original version:
  - Internal API key: requests must carry X-Internal-API-Key matching the
    INTERNAL_API_KEY env var (the Next.js layer holds the secret). The
    session_id is still supplied by Next.js, but only *after* NextAuth has
    authenticated the user — the backend no longer trusts the public internet.
  - Persistent state: indices live on disk keyed by content hash; the
    session -> document mapping is persisted to JSON and survives restarts.
  - Embedding cache: re-uploading an identical file skips embedding entirely.
  - Query cache: identical questions against the same document are served
    from a 1-hour TTL cache.
  - Structured JSON logging + /metrics endpoint (latency percentiles,
    error rates, token estimates).
  - User-safe errors: raw exception text never reaches the client.
"""
from __future__ import annotations

import json
import os
import secrets
import tempfile
import time
from collections import OrderedDict
from threading import Lock

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from cache import TTLCache
from document_loader import load_document_pages
from exceptions import RAGError, SessionNotFoundError
from flashcard_generator import generate_flashcards_from_text
from logging_config import get_logger, log_event
from metrics import collector
from pucho import pucho
from rag_pipeline import RAGPipeline, RAGSession, file_sha256
from samjha_do import samjha_do

load_dotenv()

logger = get_logger("api")

api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
DEMO_MODE = not bool(api_key)
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")
INDEX_ROOT = os.getenv("INDEX_ROOT", "indices")
SESSIONS_FILE = os.path.join(INDEX_ROOT, "sessions.json")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_LOADED_SESSIONS = 20          # LRU cap on in-memory retrievers

if DEMO_MODE:
    log_event(logger, "startup", mode="demo", warning="No API key found — AI features disabled")
else:
    log_event(logger, "startup", mode="live")
if not INTERNAL_API_KEY:
    log_event(logger, "startup_warning",
              warning="INTERNAL_API_KEY not set — backend accepts unauthenticated requests (dev only)")

app = FastAPI(title="PadhAI-Dost Backend")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── State ────────────────────────────────────────────────────────────
pipeline: RAGPipeline | None = None if DEMO_MODE else RAGPipeline(api_key, index_root=INDEX_ROOT)

_state_lock = Lock()
session_map: dict[str, str] = {}                       # session_id -> file_hash (persisted)
_loaded: OrderedDict[str, RAGSession] = OrderedDict()  # file_hash -> RAGSession (LRU)
query_cache = TTLCache(max_entries=500, ttl_seconds=3600)


def _load_session_map() -> None:
    """Restore the session -> document mapping after a restart."""
    if os.path.exists(SESSIONS_FILE):
        try:
            with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                session_map.update(json.load(f))
            log_event(logger, "sessions_restored", count=len(session_map))
        except Exception:
            logger.warning("Failed to restore session map; starting fresh")


def _persist_session_map() -> None:
    os.makedirs(INDEX_ROOT, exist_ok=True)
    with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(session_map, f)


def _get_rag_session(session_id: str) -> RAGSession:
    """Resolve a session to a loaded RAGSession (disk-backed, LRU-cached)."""
    assert pipeline is not None
    with _state_lock:
        file_hash = session_map.get(session_id)
    if not file_hash or not pipeline.has_index(file_hash):
        raise SessionNotFoundError(f"No index for session {session_id}")
    with _state_lock:
        if file_hash in _loaded:
            _loaded.move_to_end(file_hash)
            return _loaded[file_hash]
    session = pipeline.load_session(file_hash)
    with _state_lock:
        _loaded[file_hash] = session
        while len(_loaded) > MAX_LOADED_SESSIONS:
            evicted, _ = _loaded.popitem(last=False)
            log_event(logger, "session_evicted", file_hash=evicted)
    return session


def _get_text(session_id: str) -> str:
    """Load the persisted document text for non-RAG features."""
    assert pipeline is not None
    with _state_lock:
        file_hash = session_map.get(session_id)
    if not file_hash:
        raise SessionNotFoundError(f"No document for session {session_id}")
    return pipeline.load_text(file_hash)


_load_session_map()


# ── Auth dependency ──────────────────────────────────────────────────
async def verify_internal_key(x_internal_api_key: str | None = Header(default=None)) -> None:
    """Reject requests that don't carry the shared secret from the Next.js layer.

    If INTERNAL_API_KEY is unset (local dev), all requests are allowed.
    """
    if not INTERNAL_API_KEY:
        return
    if not x_internal_api_key or not secrets.compare_digest(x_internal_api_key, INTERNAL_API_KEY):
        raise HTTPException(status_code=401, detail="Unauthorized")


# ── Request logging middleware ───────────────────────────────────────
@app.middleware("http")
async def request_metrics(request: Request, call_next):
    start = time.monotonic()
    response = None
    try:
        response = await call_next(request)
        return response
    finally:
        latency_ms = (time.monotonic() - start) * 1000
        status = response.status_code if response is not None else 500
        endpoint = request.url.path
        collector.record_request(endpoint, latency_ms, ok=status < 400)
        log_event(logger, "request", method=request.method, path=endpoint,
                  status=status, latency_ms=round(latency_ms, 1))


# ── Models ───────────────────────────────────────────────────────────
class HistoryMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: list[HistoryMessage] = []


class PuchoRequest(BaseModel):
    session_id: str
    num_questions: int = 5
    difficulty: int = 5
    type: str = "Subjective"


class ExplainRequest(BaseModel):
    session_id: str
    level: str = "Intermediate"


class FlashcardRequest(BaseModel):
    session_id: str
    num_cards: int = 10


class DebugRetrieveRequest(BaseModel):
    session_id: str
    query: str
    k: int = 8


class ClearSessionRequest(BaseModel):
    session_id: str


# ── Endpoints ────────────────────────────────────────────────────────
@app.get("/")
def health_check():
    status = "Demo Mode" if DEMO_MODE else "Online"
    # Safe key fingerprint (sha256 prefix — reveals nothing about the key itself)
    # so deploys can verify WHICH credential the server is actually holding.
    fingerprint = None
    if api_key:
        import hashlib

        fingerprint = hashlib.sha256(api_key.encode()).hexdigest()[:8]
    return {
        "status": "ok",
        "message": f"PadhAI Dost Backend is Running ({status})",
        "key_fingerprint": fingerprint,
        "key_source": "GEMINI_API_KEY" if os.getenv("GEMINI_API_KEY") else (
            "OPENAI_API_KEY" if os.getenv("OPENAI_API_KEY") else None
        ),
    }


@app.get("/metrics")
def metrics():
    """Latency percentiles, error rates, and LLM usage for monitoring."""
    return collector.snapshot()


@app.get("/cache-stats")
def cache_stats():
    return {"query_cache": query_cache.stats(), "loaded_sessions": len(_loaded)}


@app.post("/upload", dependencies=[Depends(verify_internal_key)])
async def upload_document(session_id: str, file: UploadFile = File(...)):
    tmp_path = None
    try:
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

        suffix = os.path.splitext(file.filename or "file")[1].lower()
        allowed_extensions = {".pdf", ".txt", ".png", ".jpg", ".jpeg"}
        if suffix not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")

        file_hash = file_sha256(contents)

        if DEMO_MODE:
            with _state_lock:
                session_map[session_id] = file_hash
                _persist_session_map()
            return {"status": "success", "message": "Document processed (Demo)."}

        assert pipeline is not None
        cached = pipeline.has_index(file_hash)
        if not cached:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(contents)
                tmp_path = tmp.name
            pages = load_document_pages(tmp_path)
            pipeline.build_index(pages, file_hash)

        with _state_lock:
            session_map[session_id] = file_hash
            _persist_session_map()

        log_event(logger, "upload", session_id=session_id, file_hash=file_hash,
                  filename=file.filename, embedding_cache_hit=cached)
        msg = "Document already indexed — ready instantly." if cached else "Document processed and RAG ready."
        return {"status": "success", "message": msg, "cached": cached}

    except HTTPException:
        raise
    except RAGError as exc:
        logger.error("upload_failed", exc_info=True)
        raise HTTPException(status_code=422, detail=exc.user_message)
    except Exception:
        logger.error("upload_failed_unexpected", exc_info=True)
        raise HTTPException(status_code=500, detail="Upload failed. Please try again.")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/chat", dependencies=[Depends(verify_internal_key)])
async def chat(request: ChatRequest):
    if DEMO_MODE:
        return {"answer": "[DEMO]: Connect an API key to chat with your document.",
                "sources": [], "confidence": 0.0, "grounded": False}

    try:
        history = [m.model_dump() for m in request.history]

        # Cache only history-free questions (follow-ups depend on conversation state)
        cache_key = None
        if not history:
            with _state_lock:
                file_hash = session_map.get(request.session_id, "")
            cache_key = file_sha256(f"{file_hash}|{request.message.strip().lower()}".encode())
            cached = query_cache.get(cache_key)
            if cached is not None:
                log_event(logger, "chat_cache_hit", session_id=request.session_id)
                return {**cached, "cached": True}

        session = _get_rag_session(request.session_id)
        result = session.answer(request.message, history=history)

        log_event(logger, "chat", session_id=request.session_id,
                  query=request.message[:200],
                  condensed=result["condensed_question"][:200],
                  confidence=result["confidence"], grounded=result["grounded"],
                  n_sources=len(result["sources"]), timings=result["timings"])

        response = {k: result[k] for k in ("answer", "sources", "confidence", "grounded")}
        if cache_key:
            query_cache.set(cache_key, response)
        return response

    except SessionNotFoundError as exc:
        return {"answer": exc.user_message, "sources": [], "confidence": 0.0, "grounded": False}
    except RAGError as exc:
        logger.error("chat_failed", exc_info=True)
        raise HTTPException(status_code=502, detail=exc.user_message)
    except Exception:
        logger.error("chat_failed_unexpected", exc_info=True)
        raise HTTPException(status_code=500, detail="Chat failed. Please try again.")


@app.post("/debug/retrieve", dependencies=[Depends(verify_internal_key)])
async def debug_retrieve(request: DebugRetrieveRequest):
    """Retrieval-only debug view: what would the RAG system see for this query?"""
    if DEMO_MODE:
        raise HTTPException(status_code=503, detail="Not available in demo mode.")
    try:
        session = _get_rag_session(request.session_id)
        chunks = session.retrieve(request.query, k=request.k)
        return {
            "query": request.query,
            "chunks": [
                {"page": c.page, "score": round(c.score, 3),
                 "retrievers": c.retrievers, "text": c.text}
                for c in chunks
            ],
        }
    except RAGError as exc:
        raise HTTPException(status_code=422, detail=exc.user_message)


@app.post("/clear-session", dependencies=[Depends(verify_internal_key)])
async def clear_session(request: ClearSessionRequest):
    """Detach the session from its document and drop cached answers."""
    with _state_lock:
        session_map.pop(request.session_id, None)
        _persist_session_map()
    cleared = query_cache.clear()
    log_event(logger, "session_cleared", session_id=request.session_id, cache_cleared=cleared)
    return {"status": "success"}


@app.post("/pucho", dependencies=[Depends(verify_internal_key)])
async def generate_questions(request: PuchoRequest):
    if DEMO_MODE:
        return {"questions": ["1. [DEMO] What is the main topic of this document?"]}
    try:
        text = _get_text(request.session_id)
        questions = pucho(text, request.type, request.num_questions, request.difficulty, api_key)
        return {"questions": questions}
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=400, detail=exc.user_message)
    except RAGError as exc:
        logger.error("pucho_failed", exc_info=True)
        raise HTTPException(status_code=502, detail=exc.user_message)
    except Exception:
        logger.error("pucho_failed_unexpected", exc_info=True)
        raise HTTPException(status_code=500, detail="Question generation failed. Please try again.")


@app.post("/explain", dependencies=[Depends(verify_internal_key)])
async def explain_concept(request: ExplainRequest):
    if DEMO_MODE:
        return {"explanation": "[DEMO]: Connect an API key for real explanations."}
    try:
        text = _get_text(request.session_id)
        explanation = samjha_do(text, request.level, api_key)
        return {"explanation": explanation}
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=400, detail=exc.user_message)
    except RAGError as exc:
        logger.error("explain_failed", exc_info=True)
        raise HTTPException(status_code=502, detail=exc.user_message)
    except Exception:
        logger.error("explain_failed_unexpected", exc_info=True)
        raise HTTPException(status_code=500, detail="Explanation failed. Please try again.")


@app.post("/generate-flashcards", dependencies=[Depends(verify_internal_key)])
async def generate_flashcards(request: FlashcardRequest):
    if DEMO_MODE:
        return {"flashcards": [{"front": "What is RAG?",
                                "back": "Retrieval Augmented Generation — grounding LLM answers in documents."}]}
    try:
        text = _get_text(request.session_id)
        flashcards = generate_flashcards_from_text(text, request.num_cards, api_key)
        return {"flashcards": flashcards}
    except SessionNotFoundError as exc:
        raise HTTPException(status_code=400, detail=exc.user_message)
    except RAGError as exc:
        logger.error("flashcards_failed", exc_info=True)
        raise HTTPException(status_code=502, detail=exc.user_message)
    except Exception:
        logger.error("flashcards_failed_unexpected", exc_info=True)
        raise HTTPException(status_code=500, detail="Flashcard generation failed. Please try again.")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
