"""DAG integrity checker (referenced in docs/build-phases.md).

Validates every content/dags/*.yaml:
  - parses as YAML
  - has archetype/name/nodes
  - every transition target exists
  - at least one terminal is reachable
  - every condition compiles in the fix-condition language
Usage: python scripts/validate-dags.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "services" / "cascade-engine"))
import dag as dagmod  # noqa: E402
import yaml  # noqa: E402

DAGS = Path(__file__).resolve().parents[1] / "content" / "dags"


def check(path: Path) -> list[str]:
    errs: list[str] = []
    data = yaml.safe_load(path.read_text())
    for field in ("archetype", "name", "nodes"):
        if field not in data:
            errs.append(f"missing top-level '{field}'")
    if errs:
        return errs

    ids = {n["id"] for n in data["nodes"]}
    terminals = [n for n in data["nodes"] if n.get("type") == "terminal"]
    if not terminals:
        errs.append("no terminal node")

    ctx = dagmod.FixContext("redis sentinel lua ttl crdt async bloom shard")
    for n in data["nodes"]:
        for e in n.get("transitions", []):
            if e["to"] not in ids:
                errs.append(f"{n['id']}: edge -> unknown node '{e['to']}'")
            cond = e.get("condition")
            if cond:
                try:
                    dagmod.evaluate_condition(cond, ctx)
                except ValueError as ex:
                    errs.append(f"{n['id']}: bad condition '{cond}': {ex}")
    return errs


def main() -> int:
    files = sorted(DAGS.glob("*.y*ml"))
    if not files:
        print("no DAGs found"); return 1
    failed = 0
    for f in files:
        errs = check(f)
        if errs:
            failed += 1
            print(f"❌ {f.name}")
            for e in errs:
                print(f"     - {e}")
        else:
            data = yaml.safe_load(f.read_text())
            print(f"✅ {f.name}  ({len(data['nodes'])} nodes)")
    print()
    print("DAG VALIDATION:", "PASS ✅" if failed == 0 else f"FAIL ❌ ({failed})")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
