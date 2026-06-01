# Cascade — Design System

> Derived from the **ui-ux-pro-max** skill (`search.py --design-system`), applied in Phase 3.

## Foundations
- **Style:** Dark Mode (OLED) — coding/technical platform, high contrast, WCAG-friendly.
- **Typography:** `Fira Code` (display/mono, node ids & code) + `Fira Sans` (body).
  Loaded with `font-display: swap`; falls back to system-ui/monospace.
- **Palette (semantic tokens, CSS vars in `globals.css`):**
  | Token | Value | Use |
  |---|---|---|
  | `--bg` | `#0F172A` | page background |
  | `--surface` | `#1E293B` | cards |
  | `--surface-2` | `#272F42` | inputs/insets |
  | `--border` | `#475569` | borders/dividers |
  | `--fg` | `#F8FAFC` | primary text |
  | `--muted` | `#94A3B8` | secondary text |
  | accent | `#2563EB` (cascade-600) | primary actions |

## Severity & status (skill rule: never color-alone)
Every severity is shown as **color + icon + text** (`SeverityBadge`):
- critical `#EF4444` ⚡ · high `#F97316` ⚠ · medium `#F59E0B` ⚠ · low `#64748B` 🛡

## DAG / failure-map (skill: "Process Map / DAG" chart guidance)
- Happy/traversed path → **#10B981 thick** edges; un-taken edges → muted grey.
- Current failure node → **#EF4444** outline + pulse ring (the "bottleneck").
- Survived terminal → green fill; failed terminal → red fill.
- **Accessibility fallback (required):** the graph is paired with a text
  **chain list** + `sr-only` path summary, because node graphs are
  "fundamentally inaccessible without an alternative."

## Interaction (skill rules 2 & 7)
- Async buttons show a spinner + disable while pending (`Evaluating…`).
- Loading uses **skeletons**, not frozen UI.
- Micro-interactions 150–300ms; `prefers-reduced-motion` respected globally.
- Visible `:focus-visible` rings everywhere; `cursor-pointer` on actions.
- Keyboard: ⌘/Ctrl+Enter submits a fix.

## Components added in Phase 3
`ui/icons.tsx` (SVG, no emoji), `ui/SeverityBadge.tsx`, `ui/Skeleton.tsx`,
`cascade/DagMap.tsx`, redesigned `cascade/CascadePlayer.tsx` (+ post-mortem).
