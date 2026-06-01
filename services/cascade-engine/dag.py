"""DAG loader + fix-condition evaluator for the Cascade Engine.

Loads failure-mode DAGs from content/dags/*.yaml and evaluates transition
conditions written in the spec's mini-language:

    fix_contains('redis')
    fix_empty()
    fix_contains('a') AND NOT fix_contains('b')
    fix_contains('x') OR fix_contains('y')

This is the heart of "your fix spawns the next failure": given the user's free-text
fix at the current node, we pick which outgoing edge fires.
"""
from __future__ import annotations

import ast
import re
from pathlib import Path
from typing import Optional

import yaml

ROOT = Path(__file__).resolve().parents[2]
DAGS_DIR = ROOT / "content" / "dags"


# ── Condition language ──────────────────────────────────────────────────────
class FixContext:
    """Wraps the user's fix text and exposes the predicate primitives."""

    def __init__(self, fix_text: str):
        self.raw = fix_text or ""
        self.norm = self.raw.lower()

    def fix_contains(self, needle: str) -> bool:
        return needle.lower() in self.norm

    def fix_empty(self) -> bool:
        return len(self.norm.strip()) == 0


# Allowed AST node types -> a safe boolean expression evaluator (no arbitrary code).
_ALLOWED = (
    ast.Expression, ast.BoolOp, ast.UnaryOp, ast.And, ast.Or, ast.Not,
    ast.Call, ast.Name, ast.Load, ast.Constant, ast.Compare,
)


def evaluate_condition(condition: Optional[str], ctx: FixContext) -> bool:
    """Safely evaluate a transition condition against a FixContext."""
    if condition is None or str(condition).strip() == "":
        return True  # unconditional edge

    # Normalize the DSL into Python boolean syntax.
    expr = condition
    expr = re.sub(r"\bAND\b", " and ", expr)
    expr = re.sub(r"\bOR\b", " or ", expr)
    expr = re.sub(r"\bNOT\b", " not ", expr)

    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError:
        return False

    for node in ast.walk(tree):
        if not isinstance(node, _ALLOWED):
            raise ValueError(f"Disallowed expression element: {type(node).__name__}")
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in (
                "fix_contains",
                "fix_empty",
            ):
                raise ValueError(f"Disallowed function: {ast.dump(node.func)}")

    return bool(
        eval(  # noqa: S307 - sandboxed: only fix_contains/fix_empty + bool ops allowed
            compile(tree, "<condition>", "eval"),
            {"__builtins__": {}},
            {"fix_contains": ctx.fix_contains, "fix_empty": ctx.fix_empty},
        )
    )


# ── DAG model ───────────────────────────────────────────────────────────────
class Dag:
    def __init__(self, data: dict):
        self.data = data
        self.archetype = data.get("archetype")
        self.name = data.get("name")
        self.slug = data.get("slug", data.get("archetype"))
        self.nodes = {n["id"]: n for n in data["nodes"]}
        self.start = data.get("start") or next(
            (n["id"] for n in data["nodes"] if n.get("type") == "starting_state"),
            data["nodes"][0]["id"],
        )

    def node(self, node_id: str) -> dict:
        if node_id not in self.nodes:
            raise KeyError(f"Unknown node '{node_id}'")
        return self.nodes[node_id]

    def is_terminal(self, node_id: str) -> bool:
        return self.node(node_id).get("type") == "terminal"

    def first_node(self) -> str:
        """From a starting_state, follow the unconditional edge to the first issue."""
        nid = self.start
        node = self.node(nid)
        if node.get("type") == "starting_state":
            trans = node.get("transitions", [])
            if trans:
                return trans[0]["to"]
        return nid

    def resolve_transition(self, node_id: str, fix_text: str, rng=None) -> dict:
        """Given a fix at node_id, return the next edge.

        Strategy: evaluate every edge; collect those whose condition is satisfied
        ("if you fixed it this way, here's the family of failures that follows").
        Among the matched edges, pick one via *weighted random selection* so the
        same fix can lead to different downstream failures across runs — the
        "roguelike variety" the spec calls for. Falls back to the un-conditioned
        / highest-weight edges if none match (the cascade always continues).

        Pass a seeded `random.Random` via `rng` for deterministic tests.
        """
        import random as _random

        rng = rng or _random
        node = self.node(node_id)
        ctx = FixContext(fix_text)
        edges = node.get("transitions", [])

        matched = []
        for e in edges:
            cond = e.get("condition")
            try:
                if evaluate_condition(cond, ctx):
                    matched.append(e)
            except ValueError:
                continue

        if matched:
            pool, reason = matched, "condition_matched"
        elif edges:
            pool, reason = edges, "fallback"
        else:
            raise ValueError(f"Node '{node_id}' has no outgoing transitions")

        if len(pool) == 1:
            chosen = pool[0]
        else:
            weights = [max(0.0, float(e.get("weight", 1.0))) for e in pool]
            if sum(weights) <= 0:
                weights = [1.0] * len(pool)
            chosen = rng.choices(pool, weights=weights, k=1)[0]

        return {
            "to": chosen["to"],
            "condition": chosen.get("condition"),
            "reason": reason,
            "candidates": [e["to"] for e in pool],
        }


_cache: dict[str, Dag] = {}


def load_dag(slug: str) -> Dag:
    if slug in _cache:
        return _cache[slug]
    # Accept either the slug or the filename.
    candidates = [DAGS_DIR / f"{slug}.yaml", DAGS_DIR / f"{slug}.yml"]
    path = next((p for p in candidates if p.exists()), None)
    if path is None:
        # search by archetype/slug field
        for p in DAGS_DIR.glob("*.y*ml"):
            data = yaml.safe_load(p.read_text())
            if data.get("slug") == slug or data.get("archetype") == slug:
                path = p
                break
    if path is None:
        raise FileNotFoundError(f"No DAG for '{slug}'")
    dag = Dag(yaml.safe_load(path.read_text()))
    _cache[slug] = dag
    return dag
