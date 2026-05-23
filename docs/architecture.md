# Architecture

Workpath has four separate layers:

- `src/domain/sop`: native SOP authoring model.
- `src/domain/workpath`: workflow program and generated agent packet files.
- `src/domain/ideate`: compiler and Ideate-compatible audit/evidence records.
- `src/ui`: React Flow projection and inspector controls.

The native `sop.json` model is the source of truth. Ideate JSONL is compiler
output. `.workpath/workflow_program.json` is the adapter-facing control
contract. Generated packet files translate the workflow program into
human/LLM-readable instructions, context guidance, and tool policy. The canvas
must project the SOP graph; it must not make React Flow state the domain model.

Compiler-first slices deliberately keep domain contracts ahead of UI concerns.
The Research fanout path is the first vertical proof: one visual operation
compiles into structured workflow JSON plus generated packet instructions.

## Local-Only Boundary

This repo is allowed to use local git commits, but it should not have a remote
until the product is ready to publish. Documentation and examples should still
be written at portfolio quality so publication is a visibility change, not a
rewrite.
