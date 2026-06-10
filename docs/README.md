# Cascade Docs

Documentation for **Cascade** — production instinct, simulated safely.

## Strategy

The "why" behind the product — positioning, moat, business model, and the design decisions that
make Cascade defensible.

| Doc | What it covers |
|---|---|
| [positioning.md](./positioning.md) | Dual-track positioning (Simulator + Assessment), the "instinct not interview-prep" reframe, fresher→staff leveling |
| [cognitive-moat.md](./cognitive-moat.md) | The Personal Failure Profile, blind-spot modeling, why personalization is the durable moat |
| [reasoning-first.md](./reasoning-first.md) | The reasoning-before-action gate and why it's AI-cheat-resistant |
| [ai-adaptation.md](./ai-adaptation.md) | Real-time difficulty / scenario / reasoning-bar adaptation engine |
| [community-content.md](./community-content.md) | Community submissions, the curated validation gate, challenge-a-friend |
| [market-landscape.md](./market-landscape.md) | Competitive set (Codemia, ByteByteGo, DesignGurus) and where Cascade differs |
| [business-model.md](./business-model.md) | Build-and-run: bootstrap to profitability, keep control |
| [trust-architecture.md](./trust-architecture.md) | Practice/Assess data boundary, consent, retention |
| [glass-prd.md](./glass-prd.md) | "Glass" — a separate future product (see-inside-CS), incubated in Cascade |

## Engineering

The "how" — architecture, build plan, and the engine internals.

| Doc | What it covers |
|---|---|
| [architecture.md](./architecture.md) | System architecture and service map |
| [tech-stack.md](./tech-stack.md) | Languages, frameworks, infra choices |
| [build-phases.md](./build-phases.md) | Phase-by-phase build plan (0–9) |
| [cascade-engine.md](./cascade-engine.md) | Cascade engine internals (DAGs, failure propagation) |
| [engineering-concerns.md](./engineering-concerns.md) | Cross-cutting concerns map |
| [design-system.md](./design-system.md) | Premium student-portal design system (warm cream/ink, Fraunces + Jost, dark mode) |
| [deployment-strategy.md](./deployment-strategy.md) | Phased, cost-aware deploy plan (Vercel + single box → AWS scale-up), tied to build-and-run |
| [deployment.md](./deployment.md) | Deploy mechanics: service topology + pre-launch checklist (security/infra/observability/load) |

> Strategy docs marked *(planned)* describe direction not yet built; *(implemented)* docs describe
> behavior that exists in the engine today.
