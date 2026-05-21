import { describe, expect, it } from "vitest";

import { toFlowEdges, toFlowNodes } from "../../src/ui/canvas/flowModel.js";
import { readSeedSop } from "../helpers.js";

describe("flowModel", () => {
  it("projects native SOP nodes with explicit dimensions for minimap measurement", async () => {
    const sop = await readSeedSop();
    const nodes = toFlowNodes(sop, "intent");
    const intent = nodes.find((node) => node.id === "intent");

    expect(intent?.initialWidth).toBeGreaterThan(0);
    expect(intent?.initialHeight).toBeGreaterThan(0);
    expect(intent?.style).toMatchObject({ width: expect.any(Number), height: expect.any(Number) });
    expect(intent?.data.defaultPrivacy).toBe("internal");
  });

  it("routes gate and handoff edges through directional handles without visual labels", async () => {
    const sop = await readSeedSop();
    const edges = toFlowEdges(sop);
    const gate = edges.find((edge) => edge.id === "edge_reverse_gate_execute");
    const handoff = edges.find((edge) => edge.id === "edge_execute_boundary");

    expect(gate).toMatchObject({ sourceHandle: "source-top", targetHandle: "target-bottom" });
    expect(handoff).toMatchObject({ sourceHandle: "source-bottom", targetHandle: "target-top" });
    expect(edges.every((edge) => edge.label === undefined)).toBe(true);
  });
});
