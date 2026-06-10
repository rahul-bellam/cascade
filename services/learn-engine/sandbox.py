"""Snippet sandbox runner for the Learn Engine.

Executes user-submitted Python against per-test setup/call/expected triples in a
separate process with a wall-clock timeout. A small harness injects:

  - a fake in-memory `redis` client (get/set/setex/delete/exists/incr/expire)
  - a controllable clock: now() / set_time(t) / advance(dt)

so lessons like caching-redis and token-bucket run with zero external infra.
This mirrors docs/build-phases.md Step 1.2 (subprocess + timeout in dev; gVisor
in prod) but makes the documented test_cases actually executable.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from typing import Any

TIMEOUT_SECONDS = 5

# Harness prepended to every submission before execution.
HARNESS = r'''
import json as _json, sys as _sys

# ---- controllable clock -------------------------------------------------
_CLOCK = {"t": 0.0}
def now():
    return _CLOCK["t"]
def set_time(t):
    _CLOCK["t"] = float(t)
def advance(dt):
    _CLOCK["t"] += float(dt)

# ---- deterministic hashes (stable across processes; for hashing lessons) ----
import hashlib as _hashlib
def stable_hash(s, seed=0):
    h = _hashlib.sha256(f"{seed}:{s}".encode()).hexdigest()
    return int(h[:12], 16)
def ring_hash(s):
    return stable_hash(s, 0)
def bloom_hash(item, seed):
    return stable_hash(item, seed)

# ---- recorded sleep (for retry/backoff lessons; no real waiting) ----
WAITS = []
def sleep(seconds):
    WAITS.append(seconds)

# ---- fake redis ---------------------------------------------------------
class _FakeRedis:
    def __init__(self):
        self._d = {}
    def get(self, k):
        return self._d.get(k)
    def set(self, k, v, *a, **kw):
        self._d[k] = v if isinstance(v, str) else str(v)
        return True
    def setex(self, k, ttl, v):
        self._d[k] = v if isinstance(v, str) else str(v)
        return True
    def delete(self, *ks):
        n = 0
        for k in ks:
            if k in self._d:
                del self._d[k]; n += 1
        return n
    def exists(self, k):
        return 1 if k in self._d else 0
    def incr(self, k, amount=1):
        self._d[k] = str(int(self._d.get(k, "0")) + amount)
        return int(self._d[k])
    def expire(self, k, ttl):
        return 1 if k in self._d else 0
    def flushall(self):
        self._d.clear()
redis = _FakeRedis()
'''

FOOTER_TEMPLATE = r'''
# ---- test harness footer ------------------------------------------------
{setup}
_result = {call}
print("__CASCADE_RESULT__" + _json.dumps(_result, default=str))
'''


def _normalize(value: Any) -> str:
    """Stable comparison form for expected vs actual."""
    return json.dumps(value, default=str, sort_keys=True)


def run_test_case(code: str, test_case: dict) -> tuple[bool, str]:
    """Run a single test case. Returns (passed, output_or_error)."""
    setup = test_case.get("setup", "") or ""
    call = test_case["call"]
    program = HARNESS + "\n" + code + "\n" + FOOTER_TEMPLATE.format(setup=setup, call=call)

    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
        f.write(program)
        path = f.name

    try:
        proc = subprocess.run(
            [sys.executable, path],
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            env={"PATH": os.environ.get("PATH", "")},  # minimal env
        )
    except subprocess.TimeoutExpired:
        return False, f"Execution timed out (>{TIMEOUT_SECONDS}s)"
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass

    if proc.returncode != 0:
        err = (proc.stderr or "").strip().splitlines()
        return False, "Error: " + (err[-1] if err else "non-zero exit")

    marker = "__CASCADE_RESULT__"
    line = next((l for l in proc.stdout.splitlines() if l.startswith(marker)), None)
    if line is None:
        return False, "No result produced"

    actual_raw = line[len(marker):]
    try:
        actual = json.loads(actual_raw)
    except json.JSONDecodeError:
        actual = actual_raw

    expected = test_case["expected"]
    # Accept either typed equality or string-equality (spec uses string expecteds).
    passed = _normalize(actual) == _normalize(expected) or str(actual) == str(expected)
    return passed, json.dumps(actual, default=str)


def run_all(code: str, test_cases: list[dict]) -> dict:
    results = []
    for tc in test_cases:
        passed, output = run_test_case(code, tc)
        results.append({"name": tc["name"], "passed": passed, "output": output})
    return {
        "passed": all(r["passed"] for r in results) and len(results) > 0,
        "results": results,
        "tests_passed": sum(1 for r in results if r["passed"]),
        "tests_total": len(results),
    }
