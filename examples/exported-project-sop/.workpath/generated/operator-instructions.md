# Project SOP Agent Packet

Use this packet as the operating contract for a single AI work node.
Entry file: .workpath/workflow_program.json
Entry node: intent
Result node: return

## Read Order

1. workpath.json
2. .workpath/workflow_program.json
3. .workpath/generated/operator-instructions.md
4. .workpath/generated/context-pack.json
5. .workpath/generated/tool-policy.json
6. tasks.jsonl
7. handoffs.jsonl
8. review_gates.jsonl
9. artifacts.jsonl
10. privacy_boundaries.jsonl
11. events.jsonl
12. returns.jsonl
13. ownership_claims.jsonl
14. memory_candidates.jsonl
15. sop.json
16. canvas.json

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
