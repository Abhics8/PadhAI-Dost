import json
from langchain_google_genai import GoogleGenerativeAI


MAX_TEXT_LENGTH = 15000


def generate_flashcards_from_text(text: str, num_cards: int, api_key: str) -> list[dict]:
    """Generates flashcards from document text using the LLM."""
    llm = GoogleGenerativeAI(model="gemini-2.0-flash", api_key=api_key)

    truncated = text[:MAX_TEXT_LENGTH]

    prompt = f"""Generate exactly {num_cards} flashcards from the following text. Each flashcard should test a key concept, definition, or important fact.

Text:
{truncated}

Return ONLY a valid JSON array of objects, each with "front" and "back" keys.
- "front": A clear, concise question or prompt
- "back": A precise, complete answer

Rules:
- Cover the most important concepts from across the entire text
- Questions should test understanding, not just recall
- Answers should be self-contained (understandable without the question)
- Avoid overly broad or vague questions
- No duplicate or near-duplicate cards

Return ONLY the JSON array, no markdown formatting, no code blocks, no explanation."""

    response = llm.generate([prompt])
    raw = response.generations[0][0].text.strip()

    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        cards = json.loads(raw)
        if isinstance(cards, list) and all(isinstance(c, dict) and "front" in c and "back" in c for c in cards):
            return cards[:num_cards]
    except json.JSONDecodeError:
        pass

    return [{"front": "Error generating flashcards", "back": "The AI response could not be parsed. Please try again."}]
