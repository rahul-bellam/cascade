# AI-Adaptation Engine

**Status:** Strategy (planned), builds on implemented telemetry + insight engine.
**One-liner:** *The simulation adapts to the player in real time — difficulty, scenario selection, and reasoning bar all respond to how this person actually reasons.*

---

## 1. Goal

A static difficulty curve is wrong for everyone: too easy bores the strong, too hard demoralizes the
new. The AI-adaptation engine uses the live telemetry stream and the Personal Failure Profile
(`cognitive-moat.md`) to keep every player in the productive-struggle zone — challenged enough to
build instinct, not so much they bounce.

## 2. Inputs

- **Personal Failure Profile** — concern mastery, instinct biases, recurring chains, reasoning shape.
- **Live session signal** — current cascade depth survived, time-to-diagnose, hint usage, reasoning
  scores per dimension, fixes that backfired this session.
- **Population model** — aggregate difficulty/discrimination of each scenario (which levels people
  actually clear), used to place a new scenario for a given skill estimate.

## 3. Levers it pulls

1. **Scenario selection.** Bias toward the concern categories where the player is weakest, and toward
   cascade *shapes* they've previously walked into — spaced for re-exposure.
2. **Failure severity & chain depth.** Scale the magnitude of the injected failure and how many hops
   the cascade runs before it can stabilize, mapped to the leveling ladder in `positioning.md`.
3. **Reasoning bar.** Weight the insight gate (`reasoning-first.md`) toward the player's thin
   dimension — if foresight is weak, foresight counts for more before a node unlocks.
4. **Hint posture.** A struggling-new player gets earlier Socratic nudges; a strong player gets
   silence and a harder chain.

## 4. Guardrails

- **Productive struggle, not punishment.** Adaptation targets a success band (challenged, not
  crushed); it never spikes difficulty to "catch" a player.
- **Transparency.** The player can always see *why* a scenario was chosen ("you've missed the hot-key
  cascade twice — here it is again") — adaptation is a coach, not a black box.
- **Practice/Assess separation.** Assess mode uses **calibrated, fixed** difficulty per level for
  fairness; the adaptive engine runs in Practice. The two never mix (`trust-architecture.md`).
- **Consent.** Adaptation reads the Personal Failure Profile, which stays in Practice and is
  user-controlled.

## 5. Relationship to the moat

The adaptation engine is the *mechanism* that turns the cognitive moat from a passive record into an
active advantage: the better Cascade models you, the better it adapts; the better it adapts, the more
you improve and the more signal it gathers. That loop is the thing a content competitor can't
shortcut.
