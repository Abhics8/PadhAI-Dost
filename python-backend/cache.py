"""In-process caching for the RAG backend.

Two caches:
  1. Query cache  — hash(file_hash + condensed question) -> chat response (TTL).
  2. Index cache  — file content hash -> persisted FAISS index on disk, so the
     same PDF is never embedded twice (embedding is the slowest, rate-limited step).

In-memory with TTL is intentional: the backend runs as a single Render
instance. Swap `TTLCache` for Redis if the service is ever scaled horizontally.
"""
from __future__ import annotations

import threading
import time
from collections import OrderedDict
from typing import Any


class TTLCache:
    """Thread-safe LRU cache with per-entry time-to-live."""

    def __init__(self, max_entries: int = 500, ttl_seconds: float = 3600.0):
        self._max_entries = max_entries
        self._ttl = ttl_seconds
        self._store: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Any | None:
        """Return the cached value, or None if missing/expired."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self.misses += 1
                return None
            expires_at, value = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                self.misses += 1
                return None
            self._store.move_to_end(key)
            self.hits += 1
            return value

    def set(self, key: str, value: Any) -> None:
        """Insert a value, evicting the least-recently-used entry if full."""
        with self._lock:
            if key in self._store:
                self._store.move_to_end(key)
            self._store[key] = (time.monotonic() + self._ttl, value)
            while len(self._store) > self._max_entries:
                self._store.popitem(last=False)

    def clear(self) -> int:
        """Empty the cache. Returns the number of entries removed."""
        with self._lock:
            count = len(self._store)
            self._store.clear()
            return count

    def stats(self) -> dict[str, Any]:
        """Return hit/miss counters and current size."""
        with self._lock:
            total = self.hits + self.misses
            return {
                "entries": len(self._store),
                "max_entries": self._max_entries,
                "ttl_seconds": self._ttl,
                "hits": self.hits,
                "misses": self.misses,
                "hit_rate": round(self.hits / total, 3) if total else 0.0,
            }
