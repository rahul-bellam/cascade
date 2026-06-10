# Community Content — Submissions, Curation & Challenge-a-Friend

**Status:** Strategy (planned).
**One-liner:** *Scale content through the community without scaling slop — every submission passes a short, human-curated validation gate with specific, actionable feedback.*

---

## 1. Why community content

Hand-authoring every archetype across every mode does not scale, and a closed library eventually
goes stale. The supply of *real* production failure stories lives in the heads of working engineers.
Cascade's job is to turn that supply into validated, playable content — without letting volume
destroy quality (the failure mode of every UGC learning platform).

## 2. The validation gate

Submissions are **not** auto-published. Each one passes a curation gate before going live:

1. **Submit.** A contributor proposes content via the same data-driven format the engine already
   consumes (a DAG YAML, a constraint track, a lesson, or a refactor codebase) plus the failure
   narrative behind it.
2. **Automated pre-checks.** Run the existing validators first: `validate-dags.py`, lesson reference
   solutions must pass the sandbox, constraint tracks must be *winnable with the correct fix and
   fail with the wrong one*, refactor codebases must trigger the intended detectors. Anything that
   fails the machine checks bounces back immediately with the exact failure.
3. **Curated human review (~1–2 hr SLA).** A reviewer checks the thing that machines can't: is the
   failure *realistic*, is the reasoning *sound*, is the difficulty *honestly labeled*.
4. **Decision.**
   - **Accept** → published, credited to the contributor.
   - **Reject** → returned with a **specific, actionable reason**, never a silent "no."

> The differentiator is the rejection quality. A vague "not a fit" kills contribution; a precise
> "the wrong-fix path also passes the SLA gate, so the level isn't actually testing the trade-off —
> tighten the latency budget to 400ms" *teaches the contributor* and gets a fixed resubmission.

## 3. Rejection reasons (taxonomy)

Reviewers pick from a structured set so feedback is consistent and fast:

- **Not winnable / trivially winnable** — no correct fix passes, or any fix passes.
- **Unrealistic failure** — the cascade couldn't happen in a real system as described.
- **Mislabeled difficulty** — claims senior-level, tests fresher-level (or vice versa).
- **Reasoning thin** — `expected_reasoning` doesn't capture the actual judgment required.
- **Duplicate** — substantially overlaps existing content.
- **Format** — fails an automated validator (auto-attached output).

## 4. Challenge-a-friend

A lightweight viral loop on top of any scenario (authored or community):

- Finish a cascade → **"Challenge a friend to survive this."**
- The friend plays the *same* scenario; results are comparable (depth-based rank, score, time).
- The challenger sees how their friend did — a head-to-head moment that drives organic invites
  without any incentive spam.

This reuses the existing Outcome/share machinery (depth-based rank + copyable share line) and the
Arena comparison logic, so it's cheap to ship and it pulls new users into real content immediately.

## 5. Why the gate is the moat (not the bottleneck)

- A 1–2 hr human gate looks slow but is the reason the library stays *trustworthy* — the scarce,
  defensible asset.
- Specific rejections turn would-be one-shot contributors into repeat, improving contributors.
- The validators already exist (the engine is data-driven), so most of the gate is automated and
  the human only spends time on realism/judgment — the part that actually needs a human.
