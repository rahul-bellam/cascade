import os
import yaml

_archetype_cache: dict[str, dict] = {}


def content_root() -> str:
    if v := os.getenv("CONTENT_DIR"):
        return os.path.join(v, "constraints")
    candidates = [
        os.path.join("..", "..", "content", "constraints"),
        os.path.join("content", "constraints"),
        "/app/content/constraints",
    ]
    for c in candidates:
        if os.path.isdir(c):
            return c
    return candidates[0]


def load_archetype(slug: str) -> dict:
    if slug in _archetype_cache:
        return _archetype_cache[slug]
    path = os.path.join(content_root(), slug, "levels.yaml")
    with open(path) as f:
        data = yaml.safe_load(f)
    if not data.get("slug"):
        data["slug"] = slug
    _archetype_cache[slug] = data
    return data


def list_archetypes() -> list[dict]:
    root = content_root()
    out = []
    for entry in os.listdir(root):
        entry_path = os.path.join(root, entry)
        if not os.path.isdir(entry_path):
            continue
        try:
            a = load_archetype(entry)
            out.append({
                "slug": a["slug"],
                "name": a["name"],
                "starting_monolith": a["starting_monolith"],
            })
        except Exception:
            pass
    return out


def origin_code(a: dict) -> str:
    oc = a.get("origin_code", "")
    if not oc:
        return ""
    path = os.path.join(content_root(), oc)
    try:
        with open(path) as f:
            return f.read()
    except Exception:
        return ""
