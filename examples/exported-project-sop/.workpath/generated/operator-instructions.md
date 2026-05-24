# Project SOP Agent Packet

Use this packet as the operating contract for a single AI work node.
Entry file: .workpath/workflow_program.json
Entry node: intent
Result node: return
Workflow hook: .workpath/generated/workflow-hook.json

## Activation

Goal: Turn vague or multi-phase user intent into a structured, evidence-backed workflow result without forcing the operator to manually restate the process.

Use when:
- Use when the user asks for planning, implementation, repo work, research-backed decisions, or workflow design that needs more than a tiny direct answer.
- Use when the task benefits from explicit intent extraction, local context inspection, phased work, verification, or handoff discipline.
- Use when the operator asks to use Project SOP, the autonomy loop, a rigorous protocol, or a forward/reverse planning pass.

Do not use when:
- Do not use for one-command lookups, trivial edits, or purely conversational answers.
- Do not use when the user explicitly asks for no planning or only wants a quick answer.
- Do not use to persist secrets, raw transcripts, or broad personal filesystem indexes.

Return sections:
- summary
- files_changed
- verification
- risks
- next_slice

## Read Order

1. workpath.json
2. .workpath/workflow_program.json
3. .workpath/generated/workflow-hook.json
4. .workpath/generated/workflow-hook.md
5. .workpath/generated/operator-instructions.md
6. .workpath/generated/context-pack.json
7. .workpath/generated/tool-policy.json
8. tasks.jsonl
9. handoffs.jsonl
10. review_gates.jsonl
11. artifacts.jsonl
12. privacy_boundaries.jsonl
13. events.jsonl
14. returns.jsonl
15. ownership_claims.jsonl
16. memory_candidates.jsonl
17. sop.json
18. canvas.json

## Top-Level Flow

- intent -> research
- research -> plan
- plan -> execute
- execute -> verify
- verify -> return

## Fanout Operations

### Run breadth agents

- Process: research
- Operation ID: research_breadth_agents
- Run 40 independent cheap worker pass(es).
- Worker role: breadth_researcher
- Reasoning: low
- Execution mode: parallel
- Max concurrency: 10
- Fallback: run_sequentially_if_parallel_unavailable
- Required input context: research_questions, available_context
- Each worker returns research_finding with fields: claim, source, confidence, why_it_matters.
- Merge strategy: cluster_rank_synthesize
- Merge target operation: research_convergence
- Escalate when: high_conflict_between_sources, low_confidence_after_synthesis; target: research_convergence

## Synthesis Operations

### Synthesize convergence

- Process: research
- Operation ID: research_convergence
- Strategy: cluster_rank_synthesize
- Inputs: research_breadth_agents
- Output artifact: research_synthesis
- Required fields: high_signal_findings, disagreements, recommended_focus, open_questions
- Escalate when: no_clear_convergence, critical_fact_unverified; target: research_narrative

## Evidence Discipline

- Treat review gates as stop points.
- Produce the required evidence before claiming a gate has passed.
- Do not persist secrets, credentials, raw transcripts, or bulky logs in packet files.
