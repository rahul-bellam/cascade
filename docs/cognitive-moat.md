# Cognitive Moat — Personalization & Blind-Spot Modeling

**Status:** Strategy (active).
**One-liner:** *Cascade's durable edge is that it knows your blind spots — and the more you use it, the better it knows them.*

---

## 1. The thesis

Content is not a moat. Anyone can write more system-design problems; an LLM can write thousands
overnight. The moat is the **model of the individual learner** that Cascade builds over time: a
personal map of *how this specific person fails to reason* under pressure. That model can't be
copied by writing more content, and it gets stronger with every session.

> The product isn't the problems. The product is the mirror that shows you the instinct you're
> missing — and keeps adjusting what it shows you.

## 2. The Personal Failure Profile

Every interaction emits telemetry tagged by **concern** and **reasoning dimension**. Aggregated,
this becomes a Personal Failure Profile:

- **Concern mastery** — per failure category (availability, consistency, resource exhaustion,
  scalability, data loss, performance, cost, security): how reliably you diagnose and fix it.
- **Instinct biases** — your systematic tendencies, e.g. "you reach for a cache before you've
  asked whether the data can be stale," or "you scale horizontally before checking the hot key."
- **Recurring chains** — the cascade shapes you keep walking into (fix A → triggers B → you miss B).
- **Reasoning shape** — across diagnosis / trade-offs / foresight, where your reasoning is thin.
  (Foresight is the most common gap and the highest-value one to surface.)

## 3. How it feeds the experience

The profile is not a vanity dashboard — it changes what Cascade puts in front of you:

1. **Targeted scenarios** — surface failures in the categories you're weakest at, not the ones you
   already ace.
2. **Reasoning prompts that probe your gap** — if your foresight is thin, the reasoning gate weights
   foresight harder before unlocking.
3. **Spaced re-exposure** — bring back a cascade you previously botched, weeks later, to verify the
   instinct actually stuck.
4. **Honest mirror at win time** — the post-mortem names the bias, not just the bug:
   "You stabilized it, but you reached for replicas before checking the hot key — third time this month."

## 4. Why it's defensible

- **Cold-start asymmetry.** A new competitor starts every user at zero knowledge of that user. We
  start with months of their failure history.
- **Switching cost.** Leaving Cascade means abandoning the one place that actually knows your
  weaknesses — losing the mirror, not just the content.
- **Compounding data.** Every session sharpens both the individual profile *and* the population
  model that powers scenario selection and difficulty calibration.
- **Anti-commoditization.** Even if all our content leaks tomorrow, the moat (the per-user model and
  the calibration corpus) doesn't.

## 5. Guardrails

- The profile lives in the **Practice** domain and is never shared with Assess without explicit,
  revocable opt-in (`trust-architecture.md`).
- The mirror is framed as growth, never judgment — the tone is "here's the instinct to build,"
  not "here's what's wrong with you."
- Users can export and delete their full profile at any time.
