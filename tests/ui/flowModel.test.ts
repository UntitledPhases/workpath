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
    const handoffEdge = edges.find((edge) => edge.id === "edge_execute_delegate_boundary");

    expect(handoffNode?.data.layer).toBe("attachment");
    expect(handoffNode?.initialWidth).toBeLessThan(100);
    expect(handoffEdge).toMatchObject({
      source: "execute_delegate_worker",
      sourceHandle: "source-right",
      target: "boundary_codex_worker",
      targetHandle: "target-left",
      className: "edge-delegates_to"
    });
    expect(handoffEdge?.style).toMatchObject({ strokeDasharray: "5 5" });
    expect(handoffEdge?.label).toBeUndefined();
  });

  it("keeps execute handoff as a side object instead of a process step", async () => {
    const sop = await readSeedSop();
    const nodes = toFlowNodes(sop, "execute");
    const nodeIds = nodes.map((node) => node.id);
    const edges = toFlowEdges(sop, "execute");
    const sequenceEdges = edges.filter((edge) => edge.className === "edge-sequence").map((edge) => edge.id);

    expect(nodeIds).not.toContain("execute_handoff_contract");
    expect(nodeIds).not.toContain("execute_receive_return");
    expect(sequenceEdges).toEqual([
      "edge_intent_research",
      "edge_research_plan",
      "edge_plan_execute",
      "edge_execute_verify",
      "edge_verify_return",
      "edge_execute_scope_delegate",
      "edge_execute_delegate_integrate"
    ]);
  });

  it("docks selected gates onto guarded sequence edges without rendering validation branches", async () => {
    const sop = await readSeedSop();
    const edges = toFlowEdges(sop, "plan");
    const gate = edges.find((edge) => edge.id === "edge_reverse_gate_execute");
    const detailGate = edges.find((edge) => edge.id === "edge_plan_artifact_gate");
    const guardedSequence = edges.find((edge) => edge.id === "edge_plan_reverse_revise");

    expect(gate).toBeUndefined();
    expect(detailGate).toBeUndefined();
    expect(guardedSequence?.data?.gates).toEqual([
      {
        gateKind: "reverse_pass",
        id: "gate_reverse_pass",
        selected: false,
        title: "Reverse pass complete"
      }
    ]);
    expect(edges.every((edge) => edge.label === undefined)).toBe(true);
  });

  it("keeps a selected gate visible as a selected transition glyph", async () => {
    const sop = await readSeedSop();
    const nodes = toFlowNodes(sop, "gate_reverse_pass");
    const edges = toFlowEdges(sop, "gate_reverse_pass");
    const guardedSequence = edges.find((edge) => edge.id === "edge_plan_reverse_revise");

    expect(nodes.some((node) => node.id === "gate_reverse_pass")).toBe(false);
    expect(nodes.some((node) => node.id === "plan_reverse")).toBe(true);
    expect(guardedSequence?.data?.gates?.[0]).toMatchObject({
      id: "gate_reverse_pass",
      selected: true
    });
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

  it("places produced artifacts directly under their producer activity", async () => {
    const sop = await readSeedSop();
    const nodes = toFlowNodes(sop, "plan");
    const reversePass = nodes.find((node) => node.id === "plan_reverse");
    const artifact = nodes.find((node) => node.id === "artifact_reverse_pass");

    const reverseCenter = (reversePass?.position.x ?? 0) + (Number(reversePass?.style?.width) || 0) / 2;
    const artifactCenter = (artifact?.position.x ?? 0) + (Number(artifact?.style?.width) || 0) / 2;

    expect(Math.abs(reverseCenter - artifactCenter)).toBeLessThanOrEqual(8);
  });
});
