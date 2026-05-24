# Proof of Concept: Raw Codex vs Treated Codex

This proof checks the core Workpath claim:

> A small structured workflow packet can change how an LLM handles a normal
> natural-language task without turning the user prompt into a rigid form.

## What This Tests

The POC compares two fresh Codex sessions on the same business decision prompt:

- **Raw Codex:** receives only the user request.
- **Treated Codex:** receives the same request plus a small Workpath-style
  workflow hook that requires breadth, synthesis, risk handling, and a structured
  return shape.

This is intentionally a smoke test, not a benchmark. It proves visible behavior
differentiation before Workpath has a real runtime hook.

## Files

| File | Purpose |
| --- | --- |
| `examples/raw-vs-treated/raw-prompt.md` | Prompt for the raw Codex run. |
| `examples/raw-vs-treated/treated-prompt.md` | Prompt for the treated Codex run. |
| `examples/raw-vs-treated/treatment-workflow.json` | Minimal workflow packet used by the treated run. |
| `examples/raw-vs-treated/rubric.md` | Scoring rubric for comparing outputs. |
| `examples/raw-vs-treated/raw-output.md` | Sample raw output from one run. |
| `examples/raw-vs-treated/treated-output.md` | Sample treated output from one run. |
| `examples/raw-vs-treated/evaluation.md` | Sample scoring notes for one run. |

## Procedure

1. Open a fresh Codex session.
2. Paste `examples/raw-vs-treated/raw-prompt.md`.
3. Save the answer as `raw-output.md`.
4. Open a separate fresh Codex session.
5. Paste `examples/raw-vs-treated/treated-prompt.md`.
6. Save the answer as `treated-output.md`.
7. Score both answers with `examples/raw-vs-treated/rubric.md`.

## What To Look For

The treated output should show more of the workflow shape:

- explicit decision framing
- comparison of all options before the final recommendation
- structured comparison across demand, economics, and execution friction
- dedicated uncertainty or missing-context handling
- a return structure that is easier to inspect and reuse

The recommendation may be the same in both runs. That is fine. The point is
whether the workflow packet changes the operating procedure and makes the answer
more auditable.

## Current Limitation

The treatment prompt directly injects the workflow JSON. A production Workpath
runtime would instead select the workflow from a generated hook, place the packet
in a predictable context location, or pass it through an orchestrator adapter.
This POC isolates the smallest claim first: structured workflow context changes
agent behavior.
