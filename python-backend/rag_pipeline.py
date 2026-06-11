"""Hybrid RAG pipeline: BM25 + FAISS with reciprocal-rank fusion.

Design decisions (interview-relevant):
  - Hybrid retrieval: dense (FAISS + Gemini embeddings) catches paraphrases,
    sparse (BM25) catches exact terms/symbols that embeddings miss. Results
    are merged with Reciprocal Rank Fusion (RRF) — no score normalization
    needed across heterogeneous retrievers.
  - Source attribution: every chunk carries page metadata; answers return
    the chunks that backed them, with relevance scores.
  - Multi-turn: follow-up questions are rewritten into standalone questions
    using recent chat history before retrieval (condense-then-retrieve).
  - Confidence: an LLM-as-judge groundedness score; low-confidence answers
    abstain instead of hallucinating.
  - Persistence: indices are saved to disk keyed by file-content hash, so the
    same document is never embedded twice and state survives restarts.
  - No deprecated LangChain chains (RetrievalQA / ConversationalRetrievalChain);
    retrieval and generation are explicit and debuggable.
"""
from __future__ import annotations

import hashlib
import json
import os
import random
import re
import time
from dataclasses import asdict, dataclass

from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAI, GoogleGenerativeAIEmbeddings

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:  # older langchain layouts
    from langchain.text_splitter import RecursiveCharacterTextSplitter

from rank_bm25 import BM25Okapi

from exceptions import EmbeddingError, GenerationError, RetrievalError
from logging_config import get_logger, log_event
from metrics import collector

logger = get_logger("rag_pipeline")

# ── Tunables ─────────────────────────────────────────────────────────
LLM_MODEL = "gemini-2.0-flash"
EMBEDDING_MODEL = "models/gemini-embedding-001"
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
CANDIDATE_K = 8          # candidates fetched from each retriever before fusion
TOP_K = 4                # fused chunks passed to the LLM
RRF_K = 60               # standard RRF damping constant
CONFIDENCE_THRESHOLD = 0.7
EMBED_BATCH_SIZE = 10    # free-tier embedding API pacing
EMBED_BATCH_PAUSE = 5.0  # seconds between batches (stays under 15 RPM)
HISTORY_WINDOW = 5       # exchanges of chat history used for condensing


def file_sha256(data: bytes) -> str:
    """Content hash used as the index cache key."""
    return hashlib.sha256(data).hexdigest()[:16]


def _tokenize(text: str) -> list[str]:
    """Simple lowercase word tokenizer for BM25."""
    return re.findall(r"[a-z0-9]+", text.lower())


def _embedding_failure_message(exc: Exception) -> str:
    """Map the real embedding failure to an accurate user-facing message."""
    msg = str(exc)
    if any(s in msg for s in ("429", "ResourceExhausted", "RESOURCE_EXHAUSTED")) or "quota" in msg.lower():
        return ("Document indexing failed due to API rate limits. "
                "Please try again in a minute, or upload a shorter document.")
    if "FAILED_PRECONDITION" in msg or "location is not supported" in msg:
        return ("Document indexing failed: the AI provider does not accept API calls "
                "from this server's location (a free-tier restriction on datacenter IPs). "
                "(Admin: enable billing on the Google AI project, or host the backend "
                "in a supported region.)")
    if any(s in msg for s in ("401", "403", "API key", "API_KEY",
                              "PERMISSION_DENIED", "UNAUTHENTICATED")):
        return ("Document indexing failed: the AI service rejected the server's credentials. "
                "(Admin: verify GEMINI_API_KEY on the backend.)")
    return "Document indexing failed unexpectedly. Please try again."


def _retry_llm(fn, *, max_retries: int = 3, base_delay: float = 2.0):
    """Run an LLM/embedding call with exponential backoff on transient errors."""
    last_exc: Exception | None = None
    for attempt in range(max_retries):
        try:
            return fn()
        except Exception as exc:
            msg = str(exc)
            transient = any(s in msg for s in ("429", "ResourceExhausted", "503", "DeadlineExceeded", "timeout"))
            last_exc = exc
            if not transient or attempt == max_retries - 1:
                raise
            delay = base_delay * (2**attempt) + random.uniform(0, 1)
            log_event(logger, "llm_retry", attempt=attempt + 1, delay_s=round(delay, 1), error=msg[:200])
            time.sleep(delay)
    raise GenerationError(f"LLM call failed after {max_retries} retries: {last_exc}")


@dataclass
class RetrievedChunk:
    """A chunk returned by hybrid retrieval, with provenance for citations."""

    text: str
    page: int
    score: float          # fused RRF score, normalized to 0-1 within the result set
    retrievers: list[str]  # which retrievers surfaced it: ["semantic"], ["keyword"], or both

    def to_source(self, max_chars: int = 300) -> dict:
        """Citation payload sent to the frontend."""
        snippet = self.text if len(self.text) <= max_chars else self.text[:max_chars] + "…"
        return {"page": self.page, "text": snippet, "score": round(self.score, 3),
                "retrievers": self.retrievers}


class RAGPipeline:
    """Builds, persists, and loads per-document hybrid indices."""

    def __init__(self, api_key: str, index_root: str = "indices"):
        self.api_key = api_key
        self.index_root = index_root
        os.makedirs(index_root, exist_ok=True)
        self.embeddings = GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL, google_api_key=api_key)
        self.llm = GoogleGenerativeAI(model=LLM_MODEL, api_key=api_key)

    # ── Index persistence ────────────────────────────────────────────
    def index_dir(self, file_hash: str) -> str:
        return os.path.join(self.index_root, file_hash)

    def has_index(self, file_hash: str) -> bool:
        d = self.index_dir(file_hash)
        return os.path.exists(os.path.join(d, "chunks.json")) and os.path.exists(
            os.path.join(d, "index.faiss")
        )

    def build_index(self, pages: list[dict], file_hash: str) -> None:
        """Chunk pages, embed in rate-limited batches, persist FAISS + chunks.

        Idempotent: skips work if an index for this content hash already exists.
        """
        if self.has_index(file_hash):
            log_event(logger, "index_cache_hit", file_hash=file_hash)
            return

        splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
        chunks: list[dict] = []
        for page in pages:
            for piece in splitter.split_text(page["text"]):
                chunks.append({"text": piece, "page": page["page"]})
        if not chunks:
            raise EmbeddingError("Document produced no chunks.")

        log_event(logger, "index_build_start", file_hash=file_hash, n_chunks=len(chunks))
        start = time.monotonic()

        db: FAISS | None = None
        for i in range(0, len(chunks), EMBED_BATCH_SIZE):
            batch = chunks[i : i + EMBED_BATCH_SIZE]
            texts = [c["text"] for c in batch]
            metadatas = [{"page": c["page"]} for c in batch]
            try:
                partial = _retry_llm(
                    lambda t=texts, m=metadatas: FAISS.from_texts(t, self.embeddings, metadatas=m),
                    max_retries=6,
                    base_delay=10.0,
                )
            except Exception as exc:
                raise EmbeddingError(
                    f"Embedding batch {i // EMBED_BATCH_SIZE} failed: {exc}",
                    user_message=_embedding_failure_message(exc),
                ) from exc
            if db is None:
                db = partial
            else:
                db.merge_from(partial)
            if i + EMBED_BATCH_SIZE < len(chunks):
                time.sleep(EMBED_BATCH_PAUSE)  # free-tier RPM pacing

        index_dir = self.index_dir(file_hash)
        os.makedirs(index_dir, exist_ok=True)
        assert db is not None
        db.save_local(index_dir)
        with open(os.path.join(index_dir, "chunks.json"), "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False)
        full_text = "\n\n".join(p["text"] for p in pages)
        with open(os.path.join(index_dir, "text.txt"), "w", encoding="utf-8") as f:
            f.write(full_text)

        log_event(logger, "index_build_done", file_hash=file_hash,
                  n_chunks=len(chunks), seconds=round(time.monotonic() - start, 1))

    def load_text(self, file_hash: str) -> str:
        """Load the persisted full document text (for pucho/explain/flashcards)."""
        path = os.path.join(self.index_dir(file_hash), "text.txt")
        if not os.path.exists(path):
            raise RetrievalError(f"No persisted text for {file_hash}")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def load_session(self, file_hash: str) -> "RAGSession":
        """Load a persisted index into a query-ready RAGSession."""
        index_dir = self.index_dir(file_hash)
        if not self.has_index(file_hash):
            raise RetrievalError(f"No index found for {file_hash}")
        try:
            db = FAISS.load_local(index_dir, self.embeddings, allow_dangerous_deserialization=True)
            with open(os.path.join(index_dir, "chunks.json"), "r", encoding="utf-8") as f:
                chunks = json.load(f)
        except Exception as exc:
            raise RetrievalError(f"Failed to load index {file_hash}: {exc}") from exc
        return RAGSession(db=db, chunks=chunks, llm=self.llm)


class RAGSession:
    """Query-ready hybrid retriever + generator for one document."""

    def __init__(self, db: FAISS, chunks: list[dict], llm: GoogleGenerativeAI):
        self.db = db
        self.chunks = chunks
        self.llm = llm
        self._bm25 = BM25Okapi([_tokenize(c["text"]) for c in chunks])

    # ── LLM wrapper with metrics ─────────────────────────────────────
    def _call_llm(self, prompt: str) -> str:
        start = time.monotonic()
        result = _retry_llm(lambda: self.llm.invoke(prompt))
        latency_ms = (time.monotonic() - start) * 1000
        text = result if isinstance(result, str) else str(result)
        collector.record_llm_call(latency_ms, len(prompt), len(text))
        return text

    # ── Hybrid retrieval with RRF ────────────────────────────────────
    def retrieve(self, query: str, k: int = TOP_K) -> list[RetrievedChunk]:
        """BM25 + FAISS candidates fused with Reciprocal Rank Fusion."""
        try:
            semantic = self.db.similarity_search(query, k=CANDIDATE_K)
        except Exception as exc:
            raise RetrievalError(f"FAISS search failed: {exc}") from exc

        bm25_scores = self._bm25.get_scores(_tokenize(query))
        keyword_ranked = sorted(range(len(self.chunks)), key=lambda i: bm25_scores[i], reverse=True)
        keyword_ranked = [i for i in keyword_ranked[:CANDIDATE_K] if bm25_scores[i] > 0]

        # RRF: fused_score(chunk) = sum over retrievers of 1 / (RRF_K + rank)
        fused: dict[str, dict] = {}

        def _add(text: str, page: int, rank: int, retriever: str) -> None:
            key = text[:120]  # dedupe key
            entry = fused.setdefault(
                key, {"text": text, "page": page, "score": 0.0, "retrievers": []}
            )
            entry["score"] += 1.0 / (RRF_K + rank)
            if retriever not in entry["retrievers"]:
                entry["retrievers"].append(retriever)

        for rank, doc in enumerate(semantic, start=1):
            _add(doc.page_content, int(doc.metadata.get("page", 0)), rank, "semantic")
        for rank, idx in enumerate(keyword_ranked, start=1):
            _add(self.chunks[idx]["text"], int(self.chunks[idx]["page"]), rank, "keyword")

        ranked = sorted(fused.values(), key=lambda e: e["score"], reverse=True)[:k]
        if not ranked:
            return []
        max_score = ranked[0]["score"]
        return [
            RetrievedChunk(
                text=e["text"], page=e["page"],
                score=e["score"] / max_score if max_score > 0 else 0.0,
                retrievers=e["retrievers"],
            )
            for e in ranked
        ]

    # ── Multi-turn question condensing ───────────────────────────────
    def condense_question(self, question: str, history: list[dict]) -> str:
        """Rewrite a follow-up into a standalone question using recent history.

        history items: {"role": "user"|"assistant", "content": str}
        """
        if not history:
            return question
        recent = history[-(HISTORY_WINDOW * 2):]
        transcript = "\n".join(f"{m['role']}: {m['content'][:500]}" for m in recent)
        prompt = (
            "Given this conversation and a follow-up question, rewrite the follow-up "
            "as a single standalone question that contains all needed context. "
            "Return ONLY the rewritten question, nothing else.\n\n"
            f"Conversation:\n{transcript}\n\nFollow-up question: {question}\n\nStandalone question:"
        )
        try:
            rewritten = self._call_llm(prompt).strip()
            return rewritten if rewritten else question
        except Exception:
            # Condensing is best-effort; fall back to the raw question.
            log_event(logger, "condense_failed_fallback", question=question[:100])
            return question

    # ── Groundedness judge ───────────────────────────────────────────
    def score_groundedness(self, answer: str, chunks: list[RetrievedChunk]) -> float:
        """LLM-as-judge: how well is the answer supported by the chunks? (0-1)"""
        context = "\n---\n".join(c.text[:800] for c in chunks)
        prompt = (
            "You are grading whether an answer is supported by source text.\n"
            f"SOURCES:\n{context}\n\nANSWER:\n{answer}\n\n"
            'Return ONLY a JSON object: {"groundedness": <float 0 to 1>} where 1 means '
            "every claim in the answer is directly supported by the sources and 0 means none are."
        )
        try:
            raw = self._call_llm(prompt).strip()
            raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            value = float(json.loads(raw).get("groundedness", 0.5))
            return max(0.0, min(1.0, value))
        except Exception:
            log_event(logger, "groundedness_judge_failed")
            return 0.5  # unknown — neither blocks nor inflates confidence

    # ── Full answer pipeline ─────────────────────────────────────────
    def answer(self, question: str, history: list[dict] | None = None,
               check_confidence: bool = True) -> dict:
        """Condense -> retrieve -> generate -> judge. Returns the full payload."""
        timings: dict[str, float] = {}
        history = history or []

        t0 = time.monotonic()
        standalone = self.condense_question(question, history)
        timings["condense_ms"] = round((time.monotonic() - t0) * 1000, 1)

        t0 = time.monotonic()
        chunks = self.retrieve(standalone)
        timings["retrieve_ms"] = round((time.monotonic() - t0) * 1000, 1)

        if not chunks:
            return {
                "answer": "I couldn't find anything about this in your document. Try rephrasing, "
                          "or check that the document covers this topic.",
                "sources": [], "confidence": 0.0, "grounded": False,
                "condensed_question": standalone, "timings": timings,
            }

        context = "\n\n".join(f"[{i + 1}] (page {c.page}) {c.text}" for i, c in enumerate(chunks))
        prompt = (
            "Answer the question using ONLY the numbered source excerpts below. "
            "Cite sources inline like [1] or [2]. If the sources don't contain the answer, "
            "say so plainly — do not invent information.\n\n"
            f"SOURCES:\n{context}\n\nQUESTION: {standalone}\n\nANSWER:"
        )
        t0 = time.monotonic()
        answer_text = self._call_llm(prompt).strip()
        timings["generate_ms"] = round((time.monotonic() - t0) * 1000, 1)

        confidence = 1.0
        grounded = True
        if check_confidence:
            t0 = time.monotonic()
            confidence = self.score_groundedness(answer_text, chunks)
            timings["judge_ms"] = round((time.monotonic() - t0) * 1000, 1)
            grounded = confidence >= CONFIDENCE_THRESHOLD
            if not grounded:
                best = chunks[0]
                answer_text = (
                    "Your document doesn't fully cover this, so I can't give a confident answer. "
                    f"Here's the closest section (page {best.page}):\n\n\"{best.text[:400]}…\""
                )

        return {
            "answer": answer_text,
            "sources": [c.to_source() for c in chunks],
            "confidence": round(confidence, 2),
            "grounded": grounded,
            "condensed_question": standalone,
            "timings": timings,
        }


def create_rag_pipeline(text: str, api_key: str):
    """Deprecated shim kept for backward compatibility with old imports.

    New code should use RAGPipeline.build_index() + load_session().
    """
    pipeline = RAGPipeline(api_key)
    pages = [{"page": 1, "text": text}]
    file_hash = file_sha256(text.encode("utf-8"))
    pipeline.build_index(pages, file_hash)
    return pipeline.load_session(file_hash)
