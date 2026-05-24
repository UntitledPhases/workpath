# Workpath

Local-first structured SOP composer for AI work nodes.

Workpath is the visual SOP programming layer for AI work. It compiles one
authoring graph into an agent packet: a programmable harness artifact,
pasteable operator instructions, context/tool policy files, and an
audit/evidence JSONL bundle.

```text
author sop.json -> compile .workpath/workflow_program.json
                -> compile .workpath/generated/workflow-hook.json
                -> compile .workpath/generated/workflow-hook.md
                -> compile .workpath/generated/operator-instructions.md
                -> compile .workpath/generated/context-pack.json
                -> compile .workpath/generated/tool-policy.json
                -> compile audit/evidence JSONL bundle
                -> validate with agentic-sdlc
```

This repository is local-only until the product is complete enough to publish.
There is no remote, no deployment config, and no runtime agent execution.

## Current Slice

Workpath now has the compiler-first path plus an editable React Flow canvas over
the native SOP draft. The canvas uses a two-level nested-process grammar: the
overview shows only lifecycle process steps, while opening a step zooms into a
large process frame containing that step's child workflow and attached gates,
evidence, or handoff contracts. The side rail edits selected objects and
compiles the current draft into a downloadable bundle that includes a workflow
hook, `.workpath/workflow_program.json`, and generated packet files. The
inspector defaults to Simple authoring fields, with Advanced view available for
raw IDs, privacy, task bindings, and low-level contract details.

```powershell
npm install
npm run compile
npm run typecheck
npm test
npm run build
npm run dev
agentic-sdlc validate examples\exported-project-sop
agentic-sdlc visualize examples\exported-project-sop --format svg --output examples\exported-project-sop\workflow.svg
```

The compiler reads [examples/seed-project-sop.json](examples/seed-project-sop.json)
and emits [examples/exported-project-sop](examples/exported-project-sop). The
audit JSONL output proves the evidence records validate, while
`.workpath/workflow_program.json` preserves the programmable operating process
for downstream agent adapters. The generated operator instructions are the
plain-language packet a user can hand to Codex, Claude, a CLI LLM, or a future
orchestrator.

The app seeds from [examples/seed-project-sop.json](examples/seed-project-sop.json)
and keeps edits in browser draft state. The compiled bundle is an output
artifact, not the authoring source.

## Workflow Grammar

- `nodes` stores native Workpath process steps, evidence, review gates, and handoffs.
- `edges` stores the export-facing relationships needed by the compiler.
- `subprocesses` stores nested process definitions keyed by `parent_step_id`.
- `profile` stores the workflow hook: when to activate the packet, when not to,
  the workflow goal, guardrails, and the return sections expected from the agent.
- `action` on nested process activities stores executable operation semantics.
  Slice 4b supports `activity`, `agent_fanout`, and `synthesis`.
- Overview rendering shows only top-level step sequence.
- Drilldown rendering shows one selected step as a large nested process frame
  containing its child workflow plus declared attachments.
- Process and activity titles are capped at 24 characters so labels can live
  inside nodes; prose belongs in notes and sidebar fields.
- The inspector has Simple and Advanced views. Simple shows workflow-author
  fields such as purpose, objective, evidence, output, and routing intent.
  Advanced exposes contract plumbing such as IDs, privacy classification,
  task bindings, denied paths, and evidence IDs.
- Strong horizontal arrows mean sequence. Softer directional connectors mean
  artifact/control relationships.
- Gates remain first-class graph nodes, but the canvas renders mapped gates as
  clickable diamonds on the guarded transition instead of as branch nodes.
- Handoff boundaries render as side-docked ports off the activity that delegates
  work, while the boundary record remains available in the inspector/export.
- Slice 3 editing is intentionally structured: object fields, activity
  add/move/delete, and canvas drag positions are editable; arbitrary edge drawing
  is deferred.
- Slice 4a adds the first harness-oriented compile target:
  `.workpath/workflow_program.json`. It is the source artifact future Codex,
  Claude, GitHub, n8n, or internal-runner adapters should read.
- Slice 4b turns the Research subprocess into the first real programmable
  behavior path: `research_breadth_agents` can fan out to configurable cheap
  workers, then hand results to a synthesis operation.
- Slice 4c adds Workflow Profile v1: activation/non-activation rules, workflow
  goal, guardrails, return contract, and generated workflow hook JSON/Markdown.
- Slice 4d adds Simple/Advanced inspector modes so authors see the clean workflow
  surface first while systems engineers can still edit the compiled contract.

## Boundary

V1 does not run agents, publish to GitHub, deploy to Vercel, create org-level
workflows, or execute prompts. It authors a single-node SOP graph and compiles
that graph into an agent packet plus validated evidence records.

## Slice Plan

- Slice 1 complete: compiler, schemas, seed SOP, exported example, audit JSONL validation.
- Slice 2 complete: read-only React Flow canvas over the seed SOP.
- Slice 2.5 complete: drilldown canvas view, gate-on-transition rendering,
  artifact docking, and handoff side-port rendering.
- Slice 3 complete: editable draft state, structured inspector editing, nested
  process activity operations, drag-persisted canvas positions, and browser ZIP
  export.
- Slice 4a complete: workflow program export.
- Slice 4b complete: Research fanout packet export with structured operation
  actions, generated operator instructions, generated context pack, and
  generated tool policy.
- Slice 4c complete: Workflow Profile v1 with generated hook JSON/Markdown.
- Slice 4d complete: Simple/Advanced inspector modes for cleaner authoring.
- Future Slice 4e: explicit decision/agent-group/context-pack nodes, templates,
  stronger validation UX, generated handoff Markdown, JSONL schemas, and
  publish-readiness pass.

## Local-Only Discipline

This repo intentionally has no remote. Do not run `gh repo create`, `git remote
add`, or deploy commands until the product is full enough to publish.
