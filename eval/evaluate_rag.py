"""RAG evaluation harness for PadhAI-Dost.

Measures four metrics over the golden dataset:

  - retrieval_precision@k : fraction of the top-k retrieved chunks that come
                            from a ground-truth relevant page.
  - retrieval_recall@k    : fraction of ground-truth relevant pages that appear
                            among the top-k retrieved chunks (hit-rate).
  - faithfulness          : LLM-as-judge — is the generated answer supported by
                            the retrieved context? (no hallucination)
  - answer_relevance      : LLM-as-judge — does the answer actually address the
                            question, compared to the ground-truth answer?

Usage:
    python eval/evaluate_rag.py                  # full run, writes results.csv
    python eval/evaluate_rag.py --k 4
    python eval/evaluate_rag.py --no-judge       # retrieval metrics only (no API calls for grading)

Set GEMINI_API_KEY in the environment. Without it, the script runs in
retrieval-only mode is NOT possible (embeddings need the key); use --offline
to validate dataset structure and exit.

This is intentionally framework-light (no `ragas` dependency) so it runs in CI
on a free-tier key. The metric definitions match RAGAS semantics.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time

# Allow importing the backend package when run from repo root or eval/.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "python-backend"))

EVAL_DIR = os.path.dirname(__file__)
GOLDEN_PATH = os.path.join(EVAL_DIR, "golden_dataset.json")
SAMPLE_DOC = os.path.join(EVAL_DIR, "sample_doc.txt")
RESULTS_PATH = os.path.join(EVAL_DIR, "results.csv")


def load_golden() -> dict:
    with open(GOLDEN_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def validate_dataset(golden: dict) -> None:
    """Structural checks so a malformed dataset fails fast in CI."""
    items = golden["items"]
    assert len(items) >= 30, f"Expected >=30 Q&A, got {len(items)}"
    ids = [it["id"] for it in items]
    assert len(ids) == len(set(ids)), "Duplicate ids in golden dataset"
    for it in items:
        assert it["question"].strip(), f"Empty question in item {it['id']}"
        assert it["ground_truth"].strip(), f"Empty ground_truth in item {it['id']}"
        assert it["relevant_pages"], f"No relevant_pages in item {it['id']}"
    print(f"✓ Dataset valid: {len(items)} items, unique ids, all fields present.")


def build_session(api_key: str):
    """Build (or load from cache) the hybrid index over the sample document."""
    from rag_pipeline import RAGPipeline, file_sha256

    with open(SAMPLE_DOC, "r", encoding="utf-8") as f:
        text = f.read()

    # Reconstruct page structure from the "Page N —" markers so retrieval
    # metadata matches the golden dataset's relevant_pages.
    pages = _split_pages(text)
    file_hash = file_sha256(text.encode("utf-8"))

    pipeline = RAGPipeline(api_key, index_root=os.path.join(EVAL_DIR, ".eval_indices"))
    pipeline.build_index(pages, file_hash)
    return pipeline.load_session(file_hash)


def _split_pages(text: str) -> list[dict]:
    """Split the sample doc into pages by 'Page N' headings."""
    import re

    pages: list[dict] = []
    current_page: int | None = None
    buffer: list[str] = []
    for line in text.splitlines():
        m = re.match(r"\s*Page\s+(\d+)", line)
        if m:
            # Flush only once a real page is in progress; any pre-amble (title)
            # before the first marker is folded into page 1.
            if current_page is not None and buffer:
                pages.append({"page": current_page, "text": "\n".join(buffer).strip()})
                buffer = []
            current_page = int(m.group(1))
        buffer.append(line)
    if buffer and current_page is not None:
        pages.append({"page": current_page, "text": "\n".join(buffer).strip()})
    return [p for p in pages if p["text"]]


def retrieval_metrics(retrieved_pages: list[int], relevant_pages: list[int]) -> tuple[float, float]:
    """precision@k and recall@k given the pages of the retrieved chunks."""
    if not retrieved_pages:
        return 0.0, 0.0
    relevant = set(relevant_pages)
    hits = sum(1 for p in retrieved_pages if p in relevant)
    precision = hits / len(retrieved_pages)
    found = len(relevant & set(retrieved_pages))
    recall = found / len(relevant) if relevant else 0.0
    return precision, recall


def judge(session, question: str, answer: str, ground_truth: str, context: str) -> tuple[float, float]:
    """LLM-as-judge faithfulness + answer relevance, each 0-1."""
    prompt = (
        "You are evaluating a RAG answer. Score two things from 0.0 to 1.0.\n"
        f"QUESTION: {question}\n"
        f"REFERENCE ANSWER: {ground_truth}\n"
        f"RETRIEVED CONTEXT: {context}\n"
        f"GENERATED ANSWER: {answer}\n\n"
        "faithfulness = is every claim in the generated answer supported by the retrieved context?\n"
        "answer_relevance = does the generated answer correctly and completely address the question, "
        "consistent with the reference answer?\n"
        'Return ONLY JSON: {"faithfulness": <float>, "answer_relevance": <float>}'
    )
    try:
        raw = session._call_llm(prompt).strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        data = json.loads(raw)
        return (
            max(0.0, min(1.0, float(data.get("faithfulness", 0.0)))),
            max(0.0, min(1.0, float(data.get("answer_relevance", 0.0)))),
        )
    except Exception:
        return 0.0, 0.0


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate the PadhAI-Dost RAG pipeline.")
    parser.add_argument("--k", type=int, default=4, help="top-k chunks for retrieval metrics")
    parser.add_argument("--no-judge", action="store_true", help="skip LLM-as-judge metrics")
    parser.add_argument("--offline", action="store_true", help="validate dataset only, no API calls")
    parser.add_argument("--fail-under-hitrate", type=float, default=0.0)
    parser.add_argument("--fail-under-faithfulness", type=float, default=0.0)
    args = parser.parse_args()

    golden = load_golden()
    validate_dataset(golden)
    if args.offline:
        return 0

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set. Use --offline to validate the dataset without API calls.")
        return 2

    print("Building hybrid index over sample_doc.txt …")
    session = build_session(api_key)

    rows: list[dict] = []
    for item in golden["items"]:
        chunks = session.retrieve(item["question"], k=args.k)
        retrieved_pages = [c.page for c in chunks]
        precision, recall = retrieval_metrics(retrieved_pages, item["relevant_pages"])

        faith = relevance = None
        answer = ""
        if not args.no_judge:
            result = session.answer(item["question"], history=[], check_confidence=False)
            answer = result["answer"]
            context = " ".join(c.text for c in chunks)
            faith, relevance = judge(session, item["question"], answer, item["ground_truth"], context)
            time.sleep(1.0)  # free-tier RPM pacing

        rows.append({
            "id": item["id"],
            "question": item["question"],
            "relevant_pages": "|".join(map(str, item["relevant_pages"])),
            "retrieved_pages": "|".join(map(str, retrieved_pages)),
            f"precision@{args.k}": round(precision, 3),
            f"recall@{args.k}": round(recall, 3),
            "faithfulness": round(faith, 3) if faith is not None else "",
            "answer_relevance": round(relevance, 3) if relevance is not None else "",
            "answer": answer[:300].replace("\n", " "),
        })
        print(f"  [{item['id']:>2}] P@{args.k}={precision:.2f} R@{args.k}={recall:.2f}"
              + (f" faith={faith:.2f} rel={relevance:.2f}" if faith is not None else ""))

    # Aggregates
    n = len(rows)
    agg = {
        f"precision@{args.k}": sum(r[f"precision@{args.k}"] for r in rows) / n,
        f"recall@{args.k}": sum(r[f"recall@{args.k}"] for r in rows) / n,
    }
    if not args.no_judge:
        agg["faithfulness"] = sum(r["faithfulness"] for r in rows) / n
        agg["answer_relevance"] = sum(r["answer_relevance"] for r in rows) / n

    with open(RESULTS_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
        writer.writerow({})
        writer.writerow({"id": "AGGREGATE", **{k: round(v, 3) for k, v in agg.items()}})

    print("\n=== AGGREGATE METRICS ===")
    for k, v in agg.items():
        print(f"  {k:<20} {v:.3f}")
    print(f"\nWrote per-query results to {RESULTS_PATH}")

    # CI gates
    hitrate = agg[f"recall@{args.k}"]
    if args.fail_under_hitrate and hitrate < args.fail_under_hitrate:
        print(f"FAIL: recall@{args.k} {hitrate:.3f} < threshold {args.fail_under_hitrate}")
        return 1
    if not args.no_judge and args.fail_under_faithfulness and agg["faithfulness"] < args.fail_under_faithfulness:
        print(f"FAIL: faithfulness {agg['faithfulness']:.3f} < threshold {args.fail_under_faithfulness}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
