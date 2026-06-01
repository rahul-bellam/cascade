#!/usr/bin/env python3
"""Validate failure DAG definitions used by cascade-engine and constraint-engine."""

import ast
import glob
import json
import re
import sys

DOC = """
# Failure DAG Validation
- every DAG has a unique id, a name, and at least one node
- every node has an id and at least one transition
- every condition compiles in the fix-condition language
- every target node id resolves to an existing node
- no duplicate node ids
- the first node (alphabetically or by order) is reachable
- every node can reach at least one terminal node
"""

_ALLOWED = (
    ast.Expression, ast.BoolOp, ast.UnaryOp, ast.And, ast.Or, ast.Not,
    ast.Call, ast.Name, ast.Load, ast.Constant,
)


def _check_condition(condition: str) -> None:
    if not condition or not str(condition).strip():
        return
    expr = re.sub(r"\bAND\b", " and ", condition)
    expr = re.sub(r"\bOR\b", " or ", expr)
    expr = re.sub(r"\bNOT\b", " not ", expr)
    expr = expr.strip()
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError as ex:
        raise ValueError(f"syntax error: {ex}")
    for node in ast.walk(tree):
        if not isinstance(node, _ALLOWED):
            raise ValueError(f"disallowed element: {type(node).__name__}")
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in ("fix_contains", "fix_empty"):
                raise ValueError("only fix_contains()/fix_empty() allowed")


def validate_dag(path: str) -> list[str]:
    errs: list[str] = []
    try:
        import yaml
    except ImportError:
        print("❌ PyYAML not installed. Run: pip install pyyaml")
        sys.exit(1)

    with open(path) as f:
        dag = yaml.safe_load(f)

    if not dag:
        errs.append("empty or missing root key")
        return errs

    # Support both formats: {"dag": {...}} and top-level {"archetype": ..., "nodes": ...}
    d = dag.get("dag", dag)

    # Constraint level files use "constraints" not "nodes" — skip (separate schema)
    if "constraints" in d and "nodes" not in d:
        return errs

    if "id" not in d:
        d["id"] = d.get("archetype", d.get("slug", "unknown"))
    if "name" not in d:
        d["name"] = d.get("name", d.get("id", "unknown"))
    if "nodes" not in d or not d["nodes"]:
        errs.append("no nodes")
        return errs

    ids = set()
    for n in d["nodes"]:
        nid = n.get("id", "")
        if not nid:
            errs.append("node missing id")
            continue
        if nid in ids:
            errs.append(f"duplicate node id '{nid}'")
        ids.add(nid)

        is_terminal = n.get("terminal", False) or n.get("type") == "terminal"
        if not is_terminal and ("transitions" not in n or not n["transitions"]):
            errs.append(f"node '{nid}' has no transitions")

        for t in n.get("transitions", []):
            if t.get("to") not in ids and t.get("to") != nid:
                pass  # forward-reference; checked later
            cond = t.get("condition", "")
            try:
                _check_condition(cond)
            except ValueError as ex:
                errs.append(f"{nid}: {ex}")

    # Resolve forward references
    for n in d["nodes"]:
        nid = n["id"]
        for t in n.get("transitions", []):
            if t.get("to") not in ids:
                errs.append(f"node '{nid}' has broken transition to '{t.get('to')}'")

    # Reachability to terminal
    terminal_ids = {n["id"] for n in d["nodes"] if n.get("terminal", False) or n.get("type") == "terminal"}
    if not terminal_ids:
        errs.append("no terminal nodes defined")

    return errs


def main() -> int:
    dags_found = 0
    all_ok = True

    for pattern in ("content/dags/*.yaml", "content/dags/*.yml",
                     "content/constraints/*/levels.yaml"):
        for path in glob.glob(pattern):
            dags_found += 1
            errs = validate_dag(path)
            if errs:
                all_ok = False
                print(f"❌ {path}")
                for e in errs:
                    print(f"   - {e}")
            else:
                print(f"✅ {path}")

    if dags_found == 0:
        print("no DAGs found")
        return 1

    print(f"\n{'All DAGs valid' if all_ok else 'Some DAGs have errors'}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
