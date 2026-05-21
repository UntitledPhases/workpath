# Workpath

Local-first structured SOP composer for AI work nodes.

Workpath is the forward-mode authoring companion to Ideate:

```text
author sop.json -> compile Ideate JSONL bundle -> validate with agentic-sdlc
```

This repository is local-only until the product is complete enough to publish.
There is no remote, no deployment config, and no runtime agent execution.

## Current Slice

Workpath now has the compiler-first path plus a read-only React Flow canvas over
the native seed SOP. The canvas uses a two-level grammar: the overview shows
only lifecycle process steps, while selecting a step reveals its subprocess and
attached gates, evidence, or handoff contracts.

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

The compiler reads [examples/seed-project-sop.json](examples/seed-project-sop.json),
emits [examples/exported-project-sop](examples/exported-project-sop), and proves
that the output is accepted by Ideate.

The canvas also reads [examples/seed-project-sop.json](examples/seed-project-sop.json)
directly. The compiled bundle is an output artifact, not the authoring source.

## Workflow Grammar

- `nodes` stores Ideate-compatible process steps, evidence, review gates, and handoffs.
- `edges` stores the export-facing relationships needed by the compiler.
- `subprocesses` stores authoring detail graphs keyed by `parent_step_id`.
- Overview rendering shows only top-level step sequence.
- Detail rendering shows the selected step's subprocess plus declared attachments.

## Boundary

V1 does not run agents, publish to GitHub, deploy to Vercel, create org-level
workflows, or generate prompts. It authors a single-node SOP graph and compiles
that graph into validated workflow records.

## Slice Plan

- Slice 1 complete: compiler, schemas, seed SOP, exported example, Ideate validation.
- Slice 2 complete: read-only React Flow canvas over the seed SOP.
- Slice 3: editing, ZIP export, and browser-to-Ideate validation loop.

## Local-Only Discipline

This repo intentionally has no remote. Do not run `gh repo create`, `git remote
add`, or deploy commands until the product is full enough to publish.
