# Architecture

Workpath has two separate layers:

- `src/domain/sop`: native SOP authoring model.
- `src/domain/ideate`: compiler and Ideate-compatible records.

The native `sop.json` model is the source of truth. Ideate JSONL is compiler
output. The future canvas must project the SOP graph; it must not make React
Flow state the domain model.

Slice 1 deliberately contains no React code. That keeps the compiler honest
before UI concerns start pushing on the schema.

## Local-Only Boundary

This repo is allowed to use local git commits, but it should not have a remote
until the product is ready to publish. Documentation and examples should still
be written at portfolio quality so publication is a visibility change, not a
rewrite.
