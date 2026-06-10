# Reasoning-First Flow — The Anti-AI-Cheat Design

**Status:** Implemented (Cascade) + strategy.
**One-liner:** *We gate progress on judgment, not output — so an AI that writes the fix for you doesn't get you past the gate.*

---

## 1. The problem AI created

In a world where an LLM can produce a plausible system-design answer instantly, any platform that
scores the *artifact* (the diagram, the code, the chosen fix) is trivially gameable and teaches
nothing. If the value is "produce the right output," the AI already won.

Cascade's response: **make the reasoning the thing being evaluated, and require it *before* the
output.** You cannot act on a failure until you have first articulated *why* it's happening, *what
you'd trade off*, and *what your fix will break next*.

## 2. The gate

Each cascade node that matters carries an `expected_reasoning` with three dimensions:

```yaml
expected_reasoning:
  diagnosis:   [ ... what is actually failing and why ... ]
  tradeoffs:   [ ... what this fix costs / what you're choosing against ... ]
  foresight:   [ ... what second-order failure this introduces ... ]
```

Flow:

1. Failure fires. The player can inspect telemetry but **cannot apply a fix yet**.
2. The user writes free-text reasoning for diagnosis, trade-offs, and foresight.
3. `POST /cascade/{sid}/insight {diagnosis, tradeoffs, foresight}` → the insight-engine scores each
   dimension (TF-IDF against the expected reasoning) and returns
   `{diagnosis_score, tradeoff_score, foresight_score, total, unlocked, process_hint}`.
4. If `total >= 0.3` → **unlocked**: the fix options appear.
   If not → a **Socratic `process_hint`** nudges the reasoning without giving the answer, and the
   user tries again.

Verified behavior: weak reasoning scores ~0 (not unlocked, gets the hint); genuine reasoning
(~0.78) unlocks. Strength is *how you think*, not *what you type into a code box*.

## 3. Why this beats AI cheating

- **The bottleneck is articulation, not production.** Even if an AI tells you the fix, you still have
  to explain the diagnosis, the trade-off, and the foresight — and pasting the AI's explanation
  *is the learning*, because you have to read it, judge it, and own it. The gate measures whether
  you can reason, not whether you can fetch.
- **Foresight is the hardest dimension to fake.** It requires understanding the *specific* system
  state, not a generic answer — which is exactly the instinct we want to build and assess.
- **In Assess mode, reasoning is the score.** Implementation correctness is necessary but not
  sufficient; the calibrated signal is the quality of judgment, which is the thing an AI can't sit
  the assessment *for* you on without you understanding it.

## 4. Design principles

- **Reason before you act, always.** No node of consequence unlocks its fix without reasoning.
- **Hints are Socratic, never answers.** A failed gate teaches the *shape* of the missing thought.
- **Score the dimensions separately.** Diagnosis / trade-offs / foresight are reported individually
  so the Personal Failure Profile (`cognitive-moat.md`) can see *which* kind of thinking is thin.
- **Cheap to attempt, honest to pass.** Retrying the gate is free; the bar is real reasoning.
