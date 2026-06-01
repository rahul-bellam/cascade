# PRD — "Glass": See Inside Computer Science

**Status:** Concept (Idea #3) — parked until Cascade ("Jarvis") ships.
**One-liner:** *An interactive platform where you watch CS actually happen — the cache filling and evicting, the deadlock forming and resolving, the bytes moving — instead of reading about it. With the underlying math made visible, not assumed.*

> Relationship to Cascade: **separate product, shared engine.** Glass = *foundations* ("how it works"); Cascade = *application under fire* ("survive it in production"). Glass feeds Cascade.

---

## 1. Problem

Textbooks and videos teach CS **declaratively** ("a deadlock is a circular wait for resources") but the learner never *sees* it happen, can't *poke* it, and never builds the mental model that makes it stick. Same core insight as Cascade — *passive learning doesn't build instinct* — applied one layer deeper, to the **fundamentals themselves.**

- **Mechanism is invisible.** You can't watch a hash table resize, a TCP handshake retry, a B-tree split, a GC sweep, a mutex block-and-wake.
- **Math is hand-waved.** "Consistent hashing spreads load evenly" — but *why*, mathematically? Bloom-filter false-positive rate is shown as a formula, never as a *thing you feel* by sliding parameters and watching the curve move.
- **No causality.** Learners see the *what*, never the *why this leads to that*.

## 2. Core mechanic — three synchronized layers

For any concept, Glass shows simultaneously:
1. **Visualization** — animated, interactive view of the thing happening (cache evicting, threads deadlocking, packets dropping).
2. **Code** — the actual code driving it, executing *step-by-step in sync* (highlight the running line as the animation moves). Scrub / step / rewind.
3. **Math (toggleable)** — the governing equation with **live parameters**: drag a slider (cache size, # threads, load factor) and watch *both* the viz *and* the math curve respond in real time.

> The magic moment: slow down time, step through a deadlock forming thread-by-thread, see exactly which lock each thread holds and waits for, watch the resolution (timeout / lock-ordering / detection), see the resource-allocation graph update live — and the math of *when* deadlock is possible.

"Ben Eater meets VisuAlgo meets a physics sandbox, for all of CS."

## 3. Market evidence (researched) — real white space, but harder business than Cascade

**What exists today:**
- **Algorithm/DSA visualizers are SATURATED & FREE** — VisuAlgo (dominant, university-adopted), algorithm-visualizer.org (~75K visits/mo), USFCA, Python Tutor. → **Do NOT enter DSA; you'd be the 10th VisuAlgo clone.**
- **OS/systems-internals visualizers exist only as scattered one-offs** — deadlock visualizers, CPU-scheduling sims, cache simulators (EDUCache), academic tools (SysprogInteract, HASE). All **fragmented, ugly, abandoned, single-topic, academic/free.**
- **The unified combo you want — synced code + viz + math, across systems internals, as one polished platform — does NOT exist.** Closest precedent (HASE/PipeCleaner, 1999) was one domain, decades ago.
- **The math layer is essentially absent everywhere.** Genuine differentiator.

**Implications:**
- ✅ **Real white space**: unified, modern, *systems-internals + synced-code + math* platform.
- ⚠️ **DSA is a trap** (saturated). Wedge = **systems internals** (OS/concurrency, DB internals, networking, distributed).
- ⚠️ **"All of CS" is the killer risk** — every tool that survived is single-topic. Win ONE domain first.
- ⚠️ **Monetization is unproven** — this category *expects free* (VisuAlgo et al. are free; OS sims are free GitHub repos). Unlike interview prep (ByteByteGo/Codemia/DesignGurus all charge and thrive), there's no proven willingness-to-pay. **This is the #1 risk.**
- ⚠️ **Content cost is brutal** — each concept is a custom simulator, against a free-expectation market.

## 4. Strategy — incubate inside Cascade first (de-risk the monetization concern)

Don't build Glass standalone yet. The asymmetry the research reveals:
- System-design *skill/interview* market → **proven money** (Cascade's space).
- CS-internals *visualization* market → **proven demand, unproven money**.

So Glass's defensible commercial wedge = the part that overlaps Cascade and has buyers: **systems & distributed-systems internals, sold to the audience that already pays, through Cascade.**

**Sequencing:**
1. **Build "see inside" as a MODE inside Cascade first.** When a Cascade learner hits "cache stampede," let them drop into a Glass-style interactive "here's exactly how the cache fills, evicts, and stampedes — with the math." Deepens Cascade's "faithful simulation" differentiator *and* tests appetite for the visualization layer **on a paying audience**.
2. **Validate monetization there** (does the viz layer lift retention/conversion?). This de-risks the free-expectation problem before betting a whole product.
3. **If validated → spin out Glass** for the **systems-internals domain**; never try to out-VisuAlgo the DSA crowd.
4. **University/EDU licensing** = eventual revenue for the broad "all of CS + math" vision (slow B2B; phase 3).

## 5. Scope — v1 is ONE track, world-class

Candidate v1 tracks (pick highest pain + best visual+math payoff, avoid DSA):
- **Concurrency & OS** ⭐ — deadlocks, races, mutexes/semaphores, scheduling, context switches, virtual memory/paging. *(High pain, very visual, underserved.)*
- **Databases internals** ⭐ — B-trees, indexes, MVCC, isolation levels, query planning. *(Pairs directly with Cascade.)*
- Networking — TCP/IP, congestion control, TLS, DNS.
- Distributed systems — consensus (Raft/Paxos), replication, consistency models. *(Feeds Cascade; Raft viz already famous → go deeper.)*

**Recommendation: Concurrency/OS or Databases-internals first.**

## 6. Target users
- **Primary:** CS students, self-taught devs, bootcamp grads (foundations).
- **Secondary:** working engineers filling gaps ("I use mutexes daily but never *got* them"); interview preppers.
- **Tertiary ($$, later):** universities/bootcamps — Glass as interactive courseware / assigned coursework. The real revenue path.

## 7. Differentiation
| Existing | Gap Glass fills |
|---|---|
| VisuAlgo, algorithm-visualizer | DSA-only; no synced code execution; no math; no breadth |
| Ben Eater / YouTube | Brilliant but *passive video* — can't poke, change params, run your own |
| Raft/consensus one-offs | Single-topic, no platform/path/profile |
| Textbooks (OSTEP, DDIA, CLRS) | Gold-standard *content* but static → Glass = "the interactive companion to OSTEP/DDIA" |

Sharp positioning: **"the interactive layer on top of the canonical textbooks — OSTEP, but you can run every figure."**

## 8. Core features (v1)
1. Concept player — 3-layer synced view (viz + code + math) with play/pause/step/rewind/speed.
2. Parameter sandbox — sliders drive viz + math live.
3. **"Break it yourself"** — let the user *cause* the failure (create the deadlock, overflow the buffer) — Cascade DNA: learning by consequence.
4. Guided lessons — a path per track, each ending in "predict what happens / now you try."
5. Profile (shared with Cascade) — tracks concepts *grasped* vs only *viewed*; surfaces gaps.

## 9. Tech (shares Cascade's engine + design system)
- Frontend-heavy: React + Canvas/SVG/WebGL; **deterministic step-engine** so viz/code/math stay in lockstep. Reuse Cascade's Next/React/Tailwind + design system.
- Code execution: real stepwise sandbox (Cascade's snippet-runner tech) OR pre-recorded deterministic traces for complex sims (cheaper, more reliable — better margins).
- Math layer: small expression/plot engine; params bound to viz + curve.
- Shared with Cascade: auth, profile (cognitive moat), design system, content-authoring + curated submission gate.

## 10. Business model
- **B2C:** freemium → ~$12–25/mo for full library + lessons + profile.
- **B2B/EDU (real money):** site licenses for universities/bootcamps; interactive courseware.
- **Cross-sell:** Glass (foundations) → Cascade (production application). Bundle.

## 11. Moats (carry over from Cascade)
- **Hard-to-build content** = the asset (faithful interactive sims + math), same logic as Cascade's failure-DAG.
- **Cognitive/personal profile** (shared) — "what you don't understand yet."
- **The math layer + systems-internals breadth** — the two things nobody else has unified.

## 12. Risks
| Risk | Mitigation |
|---|---|
| Free-expectation market (biggest) | Incubate in Cascade (paying audience) before standalone; lead B2B/EDU |
| "All of CS" trap | One track, world-class, then expand |
| Content cost | Deterministic recorded traces; community authoring (curated) later |
| Math complexity balloon | Toggleable; few high-impact formulas first |
| Second big product | **Finish Cascade first** — don't context-switch until Jarvis ships |

## 13. Recommendation
1. **Ship Cascade first.**
2. Keep this PRD as the captured "Idea #3."
3. Architect Cascade's shared pieces (profile, design system, auth, sandbox, content/submission engine) to be reusable for Glass.
4. When Glass's turn comes: **one systems-internals track** (Concurrency/OS or DB-internals), avoid DSA, pursue EDU licensing for the grand vision.

---
*Captured 2026-06. Builds on the dual-positioning + cognitive-moat strategy in PRD.md.*
