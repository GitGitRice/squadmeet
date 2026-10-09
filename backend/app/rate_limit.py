"""A rate limit in memory (SCRUM-27): at most `limit` requests per key in a sliding window.

In memory is enough because production runs one backend process on one host (ADR-0002). A
restart clears the counters. With more processes, each one would count on its own.
"""

import math
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, status

TOO_MANY = "Zu viele Versuche. Bitte warte kurz und versuche es dann noch einmal."

_all_limits: list["RateLimit"] = []


class RateLimit:
    def __init__(self, limit: int, window_seconds: float):
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[object, deque[float]] = defaultdict(deque)
        # FastAPI runs sync routes in a thread pool, so two requests can count at once.
        self._lock = threading.Lock()
        _all_limits.append(self)

    def hit(self, key: object) -> None:
        """Count one request for `key`, or raise 429 when the key has used up its limit.
        A refused request does not count, so the key is free again when the window ends."""
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= now - self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                retry_after = math.ceil(hits[0] + self.window - now)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=TOO_MANY,
                    headers={"Retry-After": str(retry_after)},
                )
            hits.append(now)
            if len(self._hits) > 10_000:
                self._forget_idle(now)

    def _forget_idle(self, now: float) -> None:
        """Drop keys without a hit in the window, so memory does not grow with every new IP."""
        for key in [k for k, hits in self._hits.items() if hits[-1] <= now - self.window]:
            del self._hits[key]

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


def reset_all() -> None:
    """For the tests: each test starts with empty counters."""
    for limit in _all_limits:
        limit.reset()
