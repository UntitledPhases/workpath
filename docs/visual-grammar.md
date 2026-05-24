# Visual Grammar

Workpath renders the native SOP model with four shapes:

- Step: rectangle
- Gate: diamond
- Evidence: ellipse
- Boundary / handoff: hexagon

V1 step modules:

- intent
- research
- plan
- execute
- verify
- return

V1 edge kinds:

- produces
- validates
- gates
- hands_off_to

The canvas should show compact titles and shape language. Full metadata belongs
in the side panel.

The side panel uses two authoring modes:

- Simple: purpose, objective, evidence, output, handoff target, and other fields
  needed to understand behavior.
- Advanced: IDs, privacy classification, task bindings, denied paths, evidence
  IDs, and other compiler-facing contract details.

Nested process activities can now carry action contracts. The first structured
actions are:

- `activity`: ordinary operation with instructions.
- `agent_fanout`: configurable worker fanout, currently used by Research.
- `synthesis`: merge operation for fanout outputs.
