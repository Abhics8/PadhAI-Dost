"""Document loading with page-level metadata.

Returns text per page so RAG chunks can carry page numbers for citations.
Handles PDFs with empty/None pages (scanned pages with no text layer).
"""
from __future__ import annotations

import mimetypes
import os

import pytesseract
from PIL import Image
from pypdf import PdfReader

from exceptions import DocumentError
from logging_config import get_logger, log_event

logger = get_logger("document_loader")


def load_document_pages(file_path: str) -> list[dict]:
    """Load a document and return a list of ``{"page": int, "text": str}``.

    Pages with no extractable text are skipped (logged, not fatal).
    Raises DocumentError if the file is unreadable or yields no text at all.
    """
    if not os.path.exists(file_path):
        raise DocumentError(f"File does not exist: {file_path}")
    if os.path.getsize(file_path) == 0:
        raise DocumentError("Uploaded file is empty.", user_message="The uploaded file is empty.")

    mime_type, _ = mimetypes.guess_type(file_path)
    ext = os.path.splitext(file_path)[1].lower()

    try:
        if mime_type == "application/pdf" or ext == ".pdf":
            pages = _load_pdf(file_path)
        elif mime_type in ("image/png", "image/jpeg") or ext in (".png", ".jpg", ".jpeg"):
            pages = _load_image(file_path)
        elif mime_type == "text/plain" or ext == ".txt":
            pages = _load_text(file_path)
        else:
            raise DocumentError(
                f"Unsupported file type ({mime_type} / {ext}).",
                user_message="Unsupported file type. Please upload a PDF, TXT, PNG, or JPEG.",
            )
    except DocumentError:
        raise
    except Exception as exc:  # parsing libraries raise a wide variety of errors
        raise DocumentError(f"Failed to parse {ext} file: {exc}") from exc

    if not pages:
        raise DocumentError(
            "No extractable text found in document.",
            user_message=(
                "No readable text was found in this document. "
                "If it's a scanned PDF, try uploading the pages as PNG/JPEG images instead."
            ),
        )
    return pages


def _load_pdf(file_path: str) -> list[dict]:
    """Extract text per PDF page, skipping pages with no text layer."""
    reader = PdfReader(file_path)
    pages: list[dict] = []
    skipped = 0
    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text()  # may return None or ""
        if text and text.strip():
            pages.append({"page": i, "text": text.strip()})
        else:
            skipped += 1
    if skipped:
        log_event(logger, "pdf_pages_skipped", file=os.path.basename(file_path), skipped=skipped)
    return pages


def _load_image(file_path: str) -> list[dict]:
    """OCR an image into a single 'page'."""
    img = Image.open(file_path)
    text = pytesseract.image_to_string(img)
    if not text or not text.strip():
        return []
    return [{"page": 1, "text": text.strip()}]


def _load_text(file_path: str) -> list[dict]:
    """Read a plain-text file as a single 'page'."""
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    if not text.strip():
        return []
    return [{"page": 1, "text": text.strip()}]


def load_document(file_path: str) -> str:
    """Backward-compatible loader: full document text as one string."""
    pages = load_document_pages(file_path)
    return "\n\n".join(p["text"] for p in pages)
