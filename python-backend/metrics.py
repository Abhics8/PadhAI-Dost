"""Lightweight in-process metrics for the /metrics endpoint.

Tracks per-endpoint latency percentiles, error rates, LLM token usage and
uptime without any external dependency (Prometheus can scrape the JSON later).
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from typing import Any

_WINDOW = 1000  # keep the last N observations per endpoint


class MetricsCollector:
    """Thread-safe rolling-window metrics collector."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._started_at = time.time()
        self._latencies: dict[str, deque[float]] = defaultdict(lambda: deque(maxlen=_WINDOW))
        self._requests: dict[str, int] = defaultdict(int)
        self._errors: dict[str, int] = defaultdict(int)
        self._llm_calls = 0
        self._llm_latency = deque(maxlen=_WINDOW)
        self._est_input_tokens = 0
        self._est_output_tokens = 0

    def record_request(self, endpoint: str, latency_ms: float, ok: bool) -> None:
        """Record one HTTP request's outcome."""
        with self._lock:
            self._latencies[endpoint].append(latency_ms)
            self._requests[endpoint] += 1
            if not ok:
                self._errors[endpoint] += 1

    def record_llm_call(self, latency_ms: float, input_chars: int, output_chars: int) -> None:
        """Record an LLM call. Tokens are estimated as chars/4 (Gemini doesn't
        return usage via this client); the estimate is labelled as such."""
        with self._lock:
            self._llm_calls += 1
            self._llm_latency.append(latency_ms)
            self._est_input_tokens += input_chars // 4
            self._est_output_tokens += output_chars // 4

    @staticmethod
    def _percentile(values: list[float], pct: float) -> float:
        if not values:
            return 0.0
        ordered = sorted(values)
        idx = min(int(len(ordered) * pct), len(ordered) - 1)
        return round(ordered[idx], 1)

    def snapshot(self) -> dict[str, Any]:
        """Return aggregated metrics as a JSON-serializable dict."""
        with self._lock:
            endpoints: dict[str, Any] = {}
            for name, lat in self._latencies.items():
                values = list(lat)
                count = self._requests[name]
                errors = self._errors[name]
                endpoints[name] = {
                    "requests": count,
                    "errors": errors,
                    "error_rate": round(errors / count, 3) if count else 0.0,
                    "latency_ms": {
                        "p50": self._percentile(values, 0.50),
                        "p95": self._percentile(values, 0.95),
                        "p99": self._percentile(values, 0.99),
                    },
                }
            llm_values = list(self._llm_latency)
            return {
                "uptime_seconds": round(time.time() - self._started_at, 1),
                "endpoints": endpoints,
                "llm": {
                    "calls": self._llm_calls,
                    "latency_ms": {
                        "p50": self._percentile(llm_values, 0.50),
                        "p95": self._percentile(llm_values, 0.95),
                    },
                    "estimated_input_tokens": self._est_input_tokens,
                    "estimated_output_tokens": self._est_output_tokens,
                    "note": "token counts estimated as chars/4",
                },
            }


# Module-level singleton shared by api.py and rag_pipeline.py
collector = MetricsCollector()
