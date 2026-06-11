"""Custom exception hierarchy for the RAG backend.

Routes catch these and translate them into user-safe HTTP responses.
Raw exception text must never reach the client (information leakage).
"""
from __future__ import annotations


class RAGError(Exception):
    """Base class for all RAG-related failures.

    Attributes:
        user_message: A safe, user-facing description of the failure.
    """

    user_message: str = "Something went wrong while processing your request."

    def __init__(self, internal_message: str = "", user_message: str | None = None):
        super().__init__(internal_message or self.user_message)
        if user_message is not None:
            self.user_message = user_message


class DocumentError(RAGError):
    """The uploaded document could not be parsed."""

    user_message = "We couldn't read that document. Please upload a valid PDF, TXT, PNG, or JPEG."


class EmbeddingError(RAGError):
    """Embedding the document failed (usually quota exhaustion)."""

    user_message = (
        "Document indexing failed, likely due to API rate limits. "
        "Please try again in a minute, or upload a shorter document."
    )


class RetrievalError(RAGError):
    """The vector/keyword index could not be queried."""

    user_message = "We couldn't search your document right now. Please re-upload it and try again."


class GenerationError(RAGError):
    """The LLM call failed after all retries."""

    user_message = "The AI service is temporarily unavailable. Please try again shortly."


class SessionNotFoundError(RAGError):
    """No document has been indexed for this session."""

    user_message = "Please upload a document first."
