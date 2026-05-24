# Sample Evaluation

Date: 2026-05-24

## Setup

- Raw run: fresh Codex subagent, no forked thread context, plain user prompt.
- Treated run: fresh Codex subagent, no forked thread context, same user prompt plus `treatment-workflow.json`.
- Both outputs are single samples, not a statistically meaningful benchmark.

## Scores

| Dimension | Raw | Treated | Notes |
| --- | ---: | ---: | --- |
| Decision framing | 1 | 2 | Treated names criteria and missing-context caveats more explicitly. |
| Breadth before synthesis | 1 | 2 | Raw recommends first; treated compares options before supporting the recommendation. |
| Findings separation | 1 | 2 | Treated separates the workflow into comparison, evidence/reasoning, risks, next steps, and missing context. |
| Structured comparison | 0 | 2 | Treated includes the compact option table required by the workflow. |
| Risk handling | 2 | 2 | Both name concrete risks. |
| Actionability | 2 | 2 | Both include useful next steps. |
| Uncertainty discipline | 1 | 2 | Treated has a dedicated missing-context section. |
| Workflow adherence | 0 | 2 | Treated follows the injected protocol without merely describing it. |

Total:

- Raw: 8 / 16
- Treated: 16 / 16

## Result

The recommendation stayed the same, which is acceptable. The proof is that the
treated run followed a more inspectable operating procedure:

- explicit all-option comparison
- visible structured synthesis
- clearer missing-context handling
- output shape that matches the workflow contract

This supports the Workpath use case: the value is not only better words, but a
more observable and programmable procedure for how the agent handles the task.

## Caveats

- One run per condition is weak evidence.
- The treatment is direct prompt injection, not a real runtime hook yet.
- The sample model outputs include source claims that should be independently
  verified before using the HVAC recommendation in the real world.
- A stronger follow-up test should use several runs per condition and score
  source quality, variance, and workflow adherence.
