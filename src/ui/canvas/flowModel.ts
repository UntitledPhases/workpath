import { MarkerType, type Edge, type Node } from "@xyflow/react";

import {
  attachedNodesForStep,
  processSteps,
  subprocessForStep,
  type GateNode,
  type PrivacyClassification,
  type SopGraph,
  type SopNode,
  type SopSubprocess,
  type SubprocessNode
} from "../../domain/sop/index.js";

type FlowDisplayNode = SopNode | SubprocessNode;
type FlowLayer = "overview" | "detail" | "attachment";

export type CanvasScope =
  | {
      kind: "overview";
    }
  | {
      kind: "subprocess";
      stepId: string;
    };

const NODE_DIMENSIONS: Record<FlowDisplayNode["kind"], { width: number; height: number }> = {
  step: { width: 172, height: 88 },
  gate: { width: 92, height: 92 },
  evidence: { width: 112, height: 82 },
  boundary: { width: 194, height: 90 },
  activity: { width: 176, height: 86 }
};

const ATTACHMENT_NODE_DIMENSIONS: Partial<Record<FlowDisplayNode["kind"], { width: number; height: number }>> = {
  boundary: { width: 86, height: 66 },
  evidence: { width: 96, height: 72 }
};

export interface SopFlowNodeData extends Record<string, unknown> {
  defaultPrivacy: PrivacyClassification;
  layer: FlowLayer;
  node: FlowDisplayNode;
  parentStepId?: string;
  selected: boolean;
}

export interface GateEdgeBadge extends Record<string, unknown> {
  gateKind: GateNode["gate_kind"];
  id: string;
  selected: boolean;
  title: string;
}

export interface SopFlowEdgeData extends Record<string, unknown> {
  gates?: GateEdgeBadge[];
  onSelectGate?: (gateId: string) => void;
}

export type SopFlowNode = Node<SopFlowNodeData>;
export type SopFlowEdge = Edge<SopFlowEdgeData>;

export function toFlowNodes(sop: SopGraph, scope: CanvasScope, selectedNodeId?: string): SopFlowNode[] {
  const canvasPositions = new Map(sop.canvas.nodes.map((node) => [node.id, node]));
  if (scope.kind === "overview") {
    return processSteps(sop).map((node) => {
      const position = canvasPositions.get(node.id) ?? { x: 0, y: 0 };
      return toFlowNode(sop, node, "overview", position, selectedNodeId, node.id);
    });
  }

  const subprocess = subprocessForStep(sop, scope.stepId);
  if (!subprocess) {
    return [];
  }

  const dockedGateIds = gateIdsFromBadges(gateBadgesBySequenceEdge(sop, subprocess, selectedNodeId));
  const detailPositions = new Map(subprocess.canvas.nodes.map((node) => [node.id, node]));
  const nodes: SopFlowNode[] = [];
  for (const node of subprocess.nodes) {
    const position = detailPositions.get(node.id) ?? { x: 0, y: 0 };
    nodes.push(toFlowNode(sop, node, "detail", position, selectedNodeId, scope.stepId));
  }

  for (const node of attachedNodesForStep(sop, scope.stepId)) {
    if (node.kind === "gate" && dockedGateIds.has(node.id)) {
      continue;
    }
    const position = detailPositions.get(node.id) ?? canvasPositions.get(node.id) ?? { x: 0, y: 0 };
    nodes.push(toFlowNode(sop, node, "attachment", position, selectedNodeId, scope.stepId));
  }

  return nodes;
}

export function toFlowEdges(sop: SopGraph, scope: CanvasScope, selectedNodeId?: string): SopFlowEdge[] {
  if (scope.kind === "overview") {
    return sop.edges
      .filter((edge) => {
        const from = sop.nodes.find((node) => node.id === edge.from);
        const to = sop.nodes.find((node) => node.id === edge.to);
        return edge.kind === "produces" && from?.kind === "step" && to?.kind === "step";
      })
      .map((edge) => toFlowEdge(edge.id, edge.from, edge.to, "sequence"));
  }

  const subprocess = subprocessForStep(sop, scope.stepId);
  if (!subprocess) {
    return [];
  }

  const edges: SopFlowEdge[] = [];
  const dockedGatesBySequenceEdge = gateBadgesBySequenceEdge(sop, subprocess, selectedNodeId);
  const dockedGateIds = gateIdsFromBadges(dockedGatesBySequenceEdge);
  for (const edge of subprocess.edges) {
    if (edge.kind === "validates" && dockedGateIds.has(edge.to)) {
      continue;
    }
    const gates = edge.kind === "sequence" ? dockedGatesBySequenceEdge.get(edge.id) : undefined;
    edges.push(toFlowEdge(edge.id, edge.from, edge.to, edge.kind, gates?.length ? { gates } : undefined));
  }

  return edges;
}

function toFlowNode(
  sop: SopGraph,
  node: FlowDisplayNode,
  layer: FlowLayer,
  position: { x: number; y: number },
  selectedNodeId: string | undefined,
  parentStepId?: string
): SopFlowNode {
  const dimensions = nodeDimensions(node.kind, layer);
  return {
    id: node.id,
    type: "sopNode",
    position: { x: position.x, y: position.y },
    data: {
      defaultPrivacy: sop.default_privacy,
      layer,
      node,
      parentStepId,
      selected: node.id === selectedNodeId
    },
    initialWidth: dimensions.width,
    initialHeight: dimensions.height,
    style: {
      width: dimensions.width,
      height: dimensions.height
    },
    draggable: false,
    selectable: true
  };
}

function nodeDimensions(kind: FlowDisplayNode["kind"], layer: FlowLayer): { width: number; height: number } {
  if (layer === "attachment") {
    return ATTACHMENT_NODE_DIMENSIONS[kind] ?? NODE_DIMENSIONS[kind];
  }
  return NODE_DIMENSIONS[kind];
}

function toFlowEdge(
  id: string,
  source: string,
  target: string,
  kind: string,
  data?: SopFlowEdgeData
): SopFlowEdge {
  return {
    id,
    source,
    target,
    sourceHandle: sourceHandle(kind),
    targetHandle: targetHandle(kind),
    className: `edge-${kind}`,
    type: kind === "sequence" ? "gateSequence" : "smoothstep",
    data,
    animated: kind === "gates" || kind === "delegates_to",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edgeColor(kind)
    },
    style: {
      stroke: edgeColor(kind),
      strokeLinecap: "round",
      strokeWidth: edgeWidth(kind),
      strokeDasharray: edgeDash(kind)
    }
  };
}

function gateBadgesBySequenceEdge(
  sop: SopGraph,
  subprocess: SopSubprocess,
  selectedNodeId?: string
): Map<string, GateEdgeBadge[]> {
  const sopNodes = new Map(sop.nodes.map((node) => [node.id, node]));
  const subprocessEdgesById = new Map(subprocess.edges.map((edge) => [edge.id, edge]));
  const sequenceEdgeBySource = new Map(
    subprocess.edges.filter((edge) => edge.kind === "sequence").map((edge) => [edge.from, edge])
  );
  const producerByEvidence = new Map(
    subprocess.edges.filter((edge) => edge.kind === "produces").map((edge) => [edge.to, edge.from])
  );
  const badges = new Map<string, GateEdgeBadge[]>();

  for (const attachedNodeId of subprocess.attached_node_ids) {
    const gate = sopNodes.get(attachedNodeId);
    if (!gate || gate.kind !== "gate") {
      continue;
    }
    const guardedSequenceEdge = firstGuardedSequenceEdge(gate, producerByEvidence, sequenceEdgeBySource);
    if (!guardedSequenceEdge || !subprocessEdgesById.has(guardedSequenceEdge.id)) {
      continue;
    }
    const existing = badges.get(guardedSequenceEdge.id) ?? [];
    existing.push({
      gateKind: gate.gate_kind,
      id: gate.id,
      selected: gate.id === selectedNodeId,
      title: gate.title
    });
    badges.set(guardedSequenceEdge.id, existing);
  }

  return badges;
}

function gateIdsFromBadges(badges: Map<string, GateEdgeBadge[]>): Set<string> {
  return new Set([...badges.values()].flatMap((gates) => gates.map((gate) => gate.id)));
}

function firstGuardedSequenceEdge(
  gate: GateNode,
  producerByEvidence: Map<string, string>,
  sequenceEdgeBySource: Map<string, { id: string; from: string; to: string; kind: string }>
): { id: string; from: string; to: string; kind: string } | undefined {
  for (const evidenceId of gate.required_evidence) {
    const producerId = producerByEvidence.get(evidenceId);
    if (!producerId) {
      continue;
    }
    const sequenceEdge = sequenceEdgeBySource.get(producerId);
    if (sequenceEdge) {
      return sequenceEdge;
    }
  }
  return undefined;
}

function sourceHandle(kind: string): string {
  if (kind === "produces") {
    return "source-bottom";
  }
  if (kind === "gates") {
    return "source-top";
  }
  if (kind === "hands_off_to" || kind === "delegates_to") {
    return "source-right";
  }
  return "source-right";
}

function targetHandle(kind: string): string {
  if (kind === "produces") {
    return "target-top";
  }
  if (kind === "gates") {
    return "target-bottom";
  }
  if (kind === "hands_off_to" || kind === "delegates_to") {
    return "target-left";
  }
  return "target-left";
}

function edgeColor(kind: string): string {
  if (kind === "validates") {
    return "#0891b2";
  }
  if (kind === "gates") {
    return "#b45309";
  }
  if (kind === "hands_off_to") {
    return "#7c3aed";
  }
  if (kind === "delegates_to") {
    return "#7c3aed";
  }
  return "#64748b";
}

function edgeWidth(kind: string): number {
  if (kind === "sequence") {
    return 2.8;
  }
  if (kind === "delegates_to" || kind === "hands_off_to") {
    return 2.3;
  }
  return 1.6;
}

function edgeDash(kind: string): string | undefined {
  if (kind === "validates" || kind === "gates") {
    return "7 5";
  }
  if (kind === "delegates_to" || kind === "hands_off_to") {
    return "5 5";
  }
  return undefined;
}
