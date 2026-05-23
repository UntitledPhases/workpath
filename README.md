# Workpath

Local-first structured SOP composer for AI work nodes.

Workpath is the forward-mode authoring companion to Ideate:

```text
author sop.json -> compile Ideate JSONL bundle -> validate with agentic-sdlc
```

This repository is local-only until the product is complete enough to publish.
There is no remote, no deployment config, and no runtime agent execution.

## Current Slice

Workpath now has the compiler-first path plus an editable React Flow canvas over
the native SOP draft. The canvas uses a two-level nested-process grammar: the
overview shows only lifecycle process steps, while opening a step zooms into a
large process frame containing that step's child workflow and attached gates,
evidence, or handoff contracts. The side rail edits selected objects and
compiles the current draft into a downloadable Ideate bundle.

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

The app seeds from [examples/seed-project-sop.json](examples/seed-project-sop.json)
and keeps edits in browser draft state. The compiled bundle is an output
artifact, not the authoring source.

## Workflow Grammar

- `nodes` stores Ideate-compatible process steps, evidence, review gates, and handoffs.
- `edges` stores the export-facing relationships needed by the compiler.
- `subprocesses` stores nested process definitions keyed by `parent_step_id`.
- Overview rendering shows only top-level step sequence.
- Drilldown rendering shows one selected step as a large nested process frame
  containing its child workflow plus declared attachments.
- Process and activity titles are capped at 24 characters so labels can live
  inside nodes; prose belongs in notes and sidebar fields.
- Strong horizontal arrows mean sequence. Softer directional connectors mean
  artifact/control relationships.
- Gates remain first-class graph nodes, but the canvas renders mapped gates as
  clickable diamonds on the guarded transition instead of as branch nodes.
- Handoff boundaries render as side-docked ports off the activity that delegates
  work, while the boundary record remains available in the inspector/export.
- Slice 3 editing is intentionally structured: object fields, activity
  add/move/delete, and canvas drag positions are editable; arbitrary edge drawing
  is deferred.

## Boundary

V1 does not run agents, publish to GitHub, deploy to Vercel, create org-level
workflows, or generate prompts. It authors a single-node SOP graph and compiles
that graph into validated workflow records.

## Slice Plan

- Slice 1 complete: compiler, schemas, seed SOP, exported example, Ideate validation.
- Slice 2 complete: read-only React Flow canvas over the seed SOP.
- Slice 2.5 complete: drilldown canvas view, gate-on-transition rendering,
  artifact docking, and handoff side-port rendering.
- Slice 3 complete: editable draft state, structured inspector editing, nested
  process activity operations, drag-persisted canvas positions, and browser ZIP
  export.
- Slice 4: broader graph authoring, templates, stronger validation UX, and
  publish-readiness pass.

## Local-Only Discipline

This repo intentionally has no remote. Do not run `gh repo create`, `git remote
add`, or deploy commands until the product is full enough to publish.
