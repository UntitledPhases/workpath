# Audit JSONL Adapter Mapping

Workpath compiles native SOP graphs into audit JSONL records for validation and
evidence compatibility.

| Native SOP | Audit JSONL output | Notes |
| --- | --- | --- |
| step node | `task` | `status` is `planned`; `depends_on` comes from incoming `produces` edges. |
| gate node | `review_gate` | `task_id` is explicit; current validation requires gates to pass, so seed exports mark specification gates as `passed`. |
| evidence node | `artifact` | `artifact_kind`, `required`, `status`, and `command` compile directly. |
| boundary node | `handoff` | `allowed_paths` and `evidence_required` must be non-empty. |
| `produces` edge | task dependency | Only step-to-step edges affect `depends_on`. |
| `validates` edge | review evidence | Evidence-to-gate edges populate `review_gate.evidence`. |
| `gates` edge | task gate link | Gate-to-step edges populate `task.review_gate_ids`. |
| `hands_off_to` edge | handoff binding | Step-to-boundary edge confirms the boundary task binding. |

The current validator accepts empty `events.jsonl` and `returns.jsonl`; this was
verified empirically before Slice 1 was implemented. It does not accept pending
review gates in `validate` mode. Slice 1 therefore compiles gate/evidence pairs
as validated specification artifacts so the exported bundle can prove the
compiler loop. Template-specific validation is a future adapter capability, not
a Workpath Slice 1 concern.

Workpath also compiles native SOP graphs into an agent packet. The packet
includes `.workpath/workflow_program.json` as the canonical control contract and
generated `.workpath/generated/*` files for workflow activation, operator
instructions, context loading, and tool policy. The native `profile` block
compiles into `.workpath/generated/workflow-hook.json` and
`.workpath/generated/workflow-hook.md`, so downstream agents can decide when the
packet should hook into a request and what return sections are required. Nested
process activities with `action.kind: "agent_fanout"` or `action.kind:
"synthesis"` preserve behavior in the workflow program and in the generated
instructions.
