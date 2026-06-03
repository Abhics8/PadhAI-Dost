from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile
import os
from document_loader import load_document
from rag_pipeline import create_rag_pipeline
from pucho import pucho
from samjha_do import samjha_do
from flashcard_generator import generate_flashcards_from_text
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
DEMO_MODE = False

if not api_key:
    print("WARNING: No API Key found. Running in DEMO MODE.")
    DEMO_MODE = True
else:
    print("API Key found. AI features enabled.")

app = FastAPI()

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_store = {}
texts_store = {}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

class ChatRequest(BaseModel):
    session_id: str
    message: str

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

@app.get("/")
def health_check():
    status = "Demo Mode" if DEMO_MODE else "Online"
    return {"status": "ok", "message": f"PadhAI Dost Backend is Running ({status})"}

@app.post("/upload")
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

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        text = load_document(tmp_path)
        texts_store[session_id] = text

        if not DEMO_MODE:
            rag_chain = create_rag_pipeline(text, api_key)
            rag_store[session_id] = rag_chain
        else:
            rag_store[session_id] = "mock_rag_pipeline"

        msg = "Document processed (Demo)." if DEMO_MODE else "Document processed and RAG ready."
        return {"status": "success", "message": msg}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.post("/chat")
async def chat(request: ChatRequest):
    session_id = request.session_id

    if DEMO_MODE:
        import random
        demo_responses = [
            "This is a demo response. In the live version, I would analyze your document.",
            "Interesting question! Connect an API Key to get a real AI answer based on the PDF.",
            "I see you're asking about the document. This is a static demo placeholder.",
        ]
        return {"answer": f"[DEMO]: {random.choice(demo_responses)}"}

    if session_id not in rag_store:
        return {"answer": "Please upload a document first."}

    rag = rag_store[session_id]
    try:
        response = rag.run(request.message)
        return {"answer": response}
    except Exception as e:
        return {"answer": f"Error: {str(e)}"}

@app.post("/pucho")
async def generate_questions(request: PuchoRequest):
    if DEMO_MODE:
        return {"questions": [
            "1. [DEMO] What is the main topic of this document?",
            "2. [DEMO] Explain the key concept on page 1.",
            "3. [DEMO] Who is the author of this file?",
            "4. [DEMO] What are the limitations mentioned?",
            "5. [DEMO] Summarize the conclusion."
        ]}

    session_id = request.session_id
    if session_id not in texts_store:
        raise HTTPException(status_code=400, detail="No document upload found.")

    text = texts_store[session_id]
    questions = pucho(text, request.type, request.num_questions, request.difficulty, api_key)
    return {"questions": questions}

@app.post("/explain")
async def explain_concept(request: ExplainRequest):
    if DEMO_MODE:
        return {"explanation": "[DEMO]: This concept is very interesting! In a real deployment, I would use the LLM to simplify this based on your document's context."}

    session_id = request.session_id
    if session_id not in texts_store:
        raise HTTPException(status_code=400, detail="No document upload found.")

    text = texts_store[session_id]
    explanation = samjha_do(text, request.level, api_key)
    return {"explanation": explanation}

@app.post("/generate-flashcards")
async def generate_flashcards(request: FlashcardRequest):
    if DEMO_MODE:
        return {"flashcards": [
            {"front": "What is PadhAI Dost?", "back": "An AI-powered study companion that uses RAG to help students learn from their documents."},
            {"front": "What is RAG?", "back": "Retrieval Augmented Generation - a technique that grounds LLM responses in specific documents for accurate answers."},
            {"front": "What is Spaced Repetition?", "back": "A learning technique where flashcards are reviewed at increasing intervals to optimize long-term memory retention."},
        ]}

    session_id = request.session_id
    if session_id not in texts_store:
        raise HTTPException(status_code=400, detail="No document upload found.")

    text = texts_store[session_id]
    flashcards = generate_flashcards_from_text(text, request.num_cards, api_key)
    return {"flashcards": flashcards}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
