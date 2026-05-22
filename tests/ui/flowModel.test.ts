import { describe, expect, it } from "vitest";

import { toFlowEdges, toFlowNodes } from "../../src/ui/canvas/flowModel.js";
import { readSeedSop } from "../helpers.js";

describe("flowModel", () => {
  it("projects overview plus selected subprocess nodes with explicit dimensions for minimap measurement", async () => {
    const sop = await readSeedSop();
    const nodes = toFlowNodes(sop, "intent");
    const intent = nodes.find((node) => node.id === "intent");

    expect(intent?.initialWidth).toBeGreaterThan(0);
    expect(intent?.initialHeight).toBeGreaterThan(0);
    expect(intent?.style).toMatchObject({ width: expect.any(Number), height: expect.any(Number) });
    expect(intent?.data.defaultPrivacy).toBe("internal");
    expect(nodes.some((node) => node.id === "intent_goal" && node.data.layer === "detail")).toBe(true);
    expect(nodes.every((node) => node.data.layer !== "attachment")).toBe(true);
  });

  it("keeps the overview to lifecycle sequence edges only", async () => {
    const sop = await readSeedSop();
    const edges = toFlowEdges(sop);
    const edgeIds = edges.map((edge) => edge.id);

    expect(edgeIds).toEqual([
      "edge_intent_research",
      "edge_research_plan",
      "edge_plan_execute",
      "edge_execute_verify",
      "edge_verify_return"
    ]);
    expect(edges.every((edge) => edge.label === undefined)).toBe(true);
    expect(edges.every((edge) => edge.sourceHandle === "source-right")).toBe(true);
    expect(edges.every((edge) => edge.targetHandle === "target-left")).toBe(true);
  });

  it("projects selected step attachments inside the detail graph", async () => {
    const sop = await readSeedSop();
    const nodes = toFlowNodes(sop, "execute");
    const edges = toFlowEdges(sop, "execute");
    const handoffNode = nodes.find((node) => node.id === "boundary_codex_worker");
    const handoffEdge = edges.find((edge) => edge.id === "edge_execute_contract_boundary");

    expect(handoffNode?.data.layer).toBe("attachment");
    expect(handoffEdge).toMatchObject({ source: "execute_handoff_contract", target: "boundary_codex_worker" });
    expect(handoffEdge?.label).toBeUndefined();
  });

  it("routes selected gate and evidence detail edges without visual labels", async () => {
    const sop = await readSeedSop();
    const edges = toFlowEdges(sop, "plan");
    const gate = edges.find((edge) => edge.id === "edge_reverse_gate_execute");
    const detailGate = edges.find((edge) => edge.id === "edge_plan_artifact_gate");

    expect(gate).toBeUndefined();
    expect(detailGate).toMatchObject({ source: "artifact_reverse_pass", target: "gate_reverse_pass" });
    expect(edges.every((edge) => edge.label === undefined)).toBe(true);
  });

  it("routes produced artifacts through subdued vertical connectors", async () => {
    const sop = await readSeedSop();
    const edges = toFlowEdges(sop, "plan");
    const artifactEdge = edges.find((edge) => edge.id === "edge_plan_reverse_artifact");

    expect(artifactEdge).toMatchObject({
      source: "plan_reverse",
      sourceHandle: "source-bottom",
      target: "artifact_reverse_pass",
      targetHandle: "target-top",
      className: "edge-produces"
    });
    expect(artifactEdge?.style).toMatchObject({ strokeWidth: 1.6 });
  });
});
