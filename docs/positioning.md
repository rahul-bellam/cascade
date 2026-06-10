# Positioning — Dual Track

**Status:** Strategy (active). Owner: founder.
**One-liner:** *Cascade is production instinct, simulated safely — not interview prep.*

---

## 1. The reframe

The crowded framing is "LeetCode for system design" — a content library you grind to pass an
interview. Cascade is **not** that. Cascade simulates the experience of being on call when a real
system is failing, and rewards the instinct to diagnose, trade off, and foresee — the muscle that
makes someone a good engineer whether or not they ever interview again.

> Old framing: "Get ready for your system-design interview."
> Cascade framing: "Build the instinct to keep a real system alive — measured under pressure."

This matters because the buyer and the user both already sense that interview-prep is a treadmill
that AI is rapidly commoditizing. "Instinct, simulated safely" is durable: it's a *capability*, not
a *credential*.

## 2. Two tracks, one engine

Cascade runs the same simulation engine in two modes. The boundary between them is enforced (see
`trust-architecture.md`).

| | **Simulator (Practice)** | **Assessment (Assess)** |
|---|---|---|
| Who | Self-directed learners | Hiring teams evaluating candidates |
| Goal | Build instinct, see your blind spots | Calibrated, comparable signal on real judgment |
| Stakes | Low — fail freely, learn from cascades | Defined — leveled, time-boxed, fair |
| Output | Personal Failure Profile, toolkit, rank | A report: reasoning + implementation, by level |
| Data | Stays in Practice unless opted in | Never sees Practice data without consent |

The two tracks reinforce each other: Practice generates the engagement and the content moat;
Assess is the monetization that doesn't require us to become a content treadmill.

## 3. Leveling (fresher → staff)

A single problem can be run at different rigor levels, so the same archetype assesses a new grad and
a staff engineer differently — what changes is the **depth of reasoning expected**, the **severity of
injected failures**, and the **number of cascade hops** before the system stabilizes.

| Level | What we're measuring |
|---|---|
| **Fresher** | Can you reason about one failure and apply one correct fix? |
| **Mid** | Do you anticipate the *second-order* failure your fix causes? |
| **Senior** | Do you weigh trade-offs (cost / latency / consistency) before acting? |
| **Staff** | Do you reason about the *whole chain* and choose where not to act? |

Leveling is what makes Assess defensible: it's not a pass/fail gate, it's a calibrated read on
*how far up the judgment ladder* someone reasons.

## 4. Why this is hard to copy

- Interview-prep competitors are structurally content libraries; pivoting to live failure simulation
  means rebuilding their core.
- The Assess track's value compounds with calibration data, which compounds with Practice usage —
  a flywheel a content competitor can't shortcut.
- The positioning ("instinct, not credential") is the *opposite* of the SEO-driven interview-prep
  market, so we don't compete for the same keywords or the same skeptical buyer.

## 5. What we explicitly do NOT do

- We don't promise "you will pass interview X."
- We don't ship a problem dump optimized for grinding.
- We don't let Assess silently feed on Practice data (consent-gated, revocable).
