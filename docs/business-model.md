# Business Model — Build & Run

**Status:** Strategy (active). Owner: founder.
**One-liner:** *Bootstrap to profitability, keep control, build a durable cash-generating product — not a flip.*

---

## 1. The stance

Cascade is built to be **run**, not sold. The goal is a profitable, independently-controlled
product the founder keeps operating — not a venture-scale rocket optimized for an acquisition or a
liquidity event. Every strategic choice is filtered through: *does this make Cascade a better
self-sustaining business we'd be happy running for years?*

Consequences of that stance:

- **Bootstrap-first.** Prefer revenue over raising; raise only if it accelerates something we'd do
  anyway and doesn't cost control.
- **Margin and durability over growth-at-all-costs.** A smaller, profitable, loyal base beats a
  large unprofitable one.
- **Own the moat, not just the traffic.** Invest in the cognitive moat and calibration data
  (`cognitive-moat.md`), which compound and are hard to copy — not in SEO churn that resets yearly.

## 2. Revenue lines

Two tracks (see `positioning.md`), monetized differently:

| Line | Buyer | Model | Why it fits build-and-run |
|---|---|---|---|
| **Practice (Simulator)** | Individual engineers | Subscription | Recurring, high-retention because the moat is *their* profile; low marginal cost per user |
| **Assess (Assessment)** | Hiring teams | Per-seat / per-assessment | Higher ACV, doesn't require a content treadmill, compounds with calibration data |
| **Community** | (cost center → moat) | Curation gate | Scales content supply cheaply; see `community-content.md` |

Practice funds engagement and the data flywheel; Assess provides the higher-margin revenue that
keeps the business profitable without us becoming a content factory.

## 3. Why this is the right model for this product

- The **cognitive moat compounds with usage**, so retention (not constant new-content acquisition)
  is the growth engine — perfectly aligned with a subscription business we want to run long-term.
- **Assess revenue is decoupled from content volume.** We get paid for calibrated *judgment signal*,
  which improves as the engine and data mature — not for how many problems we shipped this quarter.
- **AI-resistant by design.** The reasoning-first gate (`reasoning-first.md`) means our value doesn't
  evaporate as models get better at producing answers — it arguably *increases*, because judgment
  becomes the scarce thing.

## 4. Cost discipline

- Data-driven content (`content/`) means new archetypes are YAML + a curation pass, not new code.
- Mixed Go (hot-path engines) + Python (FastAPI services) keeps the simulation cheap to run.
- Community curation offloads authoring while the validation gate protects quality.

## 5. What we measure

- **Retention & profile depth** (Practice) — are users coming back, and is the mirror getting
  sharper? This is the leading indicator of the moat.
- **Assess ACV & calibration quality** (Assess) — revenue per hiring team and how predictive the
  signal is.
- **Contribution health** (Community) — accept rate, resubmission rate, time-to-review.
- **Unit economics** — gross margin per active user; we keep this positive by design.

## 6. Explicit non-goals

- Not optimizing for an acquihire or a flip.
- Not chasing vanity growth that we can't serve profitably.
- Not becoming a content-volume treadmill to compete on SEO with interview-prep incumbents.
