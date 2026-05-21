import { describe, expect, it } from "vitest";
import fc from "fast-check";

import {
  compileToIdeateBundle,
  ideateRecordSchema
} from "../../src/domain/ideate/index.js";
import { type SopGraph } from "../../src/domain/sop/index.js";

function simpleSop(title: string): SopGraph {
  const clean = title.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Generated";
  return {
    schema_version: "1.0",
    kind: "single_node_sop",
    id: `sop_${clean}`,
    title,
    entry_node_id: "intent",
    result_node_id: "return",
    default_privacy: "internal",
    nodes: [
      { id: "intent", kind: "step", module: "intent", title: "Intent" },
      { id: "return", kind: "step", module: "return", title: "Return" },
      {
        id: "artifact_done",
        kind: "evidence",
        artifact_kind: "test_result",
        title: "Done",
        required: true,
        command: "npm test"
      },
      {
        id: "gate_done",
        kind: "gate",
        gate_kind: "tests",
        task_id: "return",
        title: "Done gate",
        required_evidence: ["artifact_done"]
      }
    ],
    edges: [
      { id: "edge_intent_return", from: "intent", to: "return", kind: "produces" },
      { id: "edge_gate_return", from: "gate_done", to: "return", kind: "gates" },
      { id: "edge_artifact_gate", from: "artifact_done", to: "gate_done", kind: "validates" }
    ],
    subprocesses: [],
    canvas: {
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        { id: "intent", x: 0, y: 0 },
        { id: "return", x: 200, y: 0 },
        { id: "artifact_done", x: 100, y: 100 },
        { id: "gate_done", x: 200, y: 100 }
      ]
    }
  };
}

describe("compiler property", () => {
  it("emits records accepted by vendored Ideate schemas", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 24 }), (title) => {
        const bundle = compileToIdeateBundle(simpleSop(title), {
          createdAt: "2026-05-20T20:00:00.000Z",
          compilerVersion: "workpath-compiler@test"
        });
        for (const records of Object.values(bundle)) {
          for (const record of records) {
            expect(ideateRecordSchema.parse(record)).toBeTruthy();
          }
        }
      }),
      { numRuns: 25 }
    );
  });
});
