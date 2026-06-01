"""Seed lessons (and validate DAGs) into the database.

- With DATABASE_URL set: upserts every content/lessons/*.yaml into Postgres
  via the learn-engine store layer.
- Without it: seeds the local SQLite dev DB and prints what was loaded.
Usage: python scripts/seed-content.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "learn-engine"))
sys.path.insert(0, str(ROOT / "services" / "cascade-engine"))

import store  # noqa: E402


def main() -> int:
    s = store.get_store()  # constructing the store seeds lessons from YAML
    lessons = s.get_lessons()
    backend = "postgres" if store.USE_PG else "sqlite"
    print(f"Seeded {len(lessons)} lessons into {backend}:")
    for L in lessons:
        print(f"  - {L['slug']:20s} {L['title']}  ({len(L['snippet_test_cases'])} tests)")

    # Validate DAGs as part of seeding.
    import dag as dagmod  # noqa: E402
    dags = list((ROOT / "content" / "dags").glob("*.y*ml"))
    print(f"\nValidating {len(dags)} DAG(s):")
    for p in dags:
        d = dagmod.load_dag(p.stem)
        print(f"  - {d.slug:20s} {len(d.nodes)} nodes, start={d.start}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
