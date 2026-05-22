import { MarkerType, type Edge, type Node } from "@xyflow/react";

import {
  activeStepIdForSelection,
  attachedNodesForStep,
  processSteps,
  subprocessForStep,
  type PrivacyClassification,
  type SopGraph,
  type SopNode,
  type SubprocessNode
} from "../../domain/sop/index.js";

type FlowDisplayNode = SopNode | SubprocessNode;
type FlowLayer = "overview" | "detail" | "attachment";

const NODE_DIMENSIONS: Record<FlowDisplayNode["kind"], { width: number; height: number }> = {
  step: { width: 172, height: 88 },
  gate: { width: 92, height: 92 },
  evidence: { width: 112, height: 82 },
  boundary: { width: 194, height: 90 },
  activity: { width: 176, height: 86 }
};

export interface SopFlowNodeData extends Record<string, unknown> {
  defaultPrivacy: PrivacyClassification;
  layer: FlowLayer;
  node: FlowDisplayNode;
  parentStepId?: string;
  selected: boolean;
}

export type SopFlowNode = Node<SopFlowNodeData>;
export type SopFlowEdge = Edge;

export function toFlowNodes(sop: SopGraph, selectedNodeId?: string): SopFlowNode[] {
  const activeStepId = activeStepIdForSelection(sop, selectedNodeId);
  const canvasPositions = new Map(sop.canvas.nodes.map((node) => [node.id, node]));
  const nodes: SopFlowNode[] = processSteps(sop).map((node) => {
    const position = canvasPositions.get(node.id) ?? { x: 0, y: 0 };
    return toFlowNode(sop, node, "overview", position, selectedNodeId, node.id);
  });

  if (!activeStepId) {
    return nodes;
  }

  const subprocess = subprocessForStep(sop, activeStepId);
  if (!subprocess) {
    return nodes;
  }

  const detailPositions = new Map(subprocess.canvas.nodes.map((node) => [node.id, node]));
  for (const node of subprocess.nodes) {
    const position = detailPositions.get(node.id) ?? { x: 0, y: 0 };
    nodes.push(toFlowNode(sop, node, "detail", position, selectedNodeId, activeStepId));
  }

  for (const node of attachedNodesForStep(sop, activeStepId)) {
    const position = detailPositions.get(node.id) ?? canvasPositions.get(node.id) ?? { x: 0, y: 0 };
    nodes.push(toFlowNode(sop, node, "attachment", position, selectedNodeId, activeStepId));
  }

  return nodes;
}

export function toFlowEdges(sop: SopGraph, selectedNodeId?: string): SopFlowEdge[] {
  const edges: SopFlowEdge[] = sop.edges
    .filter((edge) => {
      const from = sop.nodes.find((node) => node.id === edge.from);
      const to = sop.nodes.find((node) => node.id === edge.to);
      return edge.kind === "produces" && from?.kind === "step" && to?.kind === "step";
    })
    .map((edge) => toFlowEdge(edge.id, edge.from, edge.to, "sequence"));

  const activeStepId = activeStepIdForSelection(sop, selectedNodeId);
  const subprocess = activeStepId ? subprocessForStep(sop, activeStepId) : undefined;
  if (!subprocess) {
    return edges;
  }

  for (const edge of subprocess.edges) {
    edges.push(toFlowEdge(edge.id, edge.from, edge.to, edge.kind));
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
  const dimensions = NODE_DIMENSIONS[node.kind];
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

function toFlowEdge(id: string, source: string, target: string, kind: string): SopFlowEdge {
  return {
    id,
    source,
    target,
    sourceHandle: sourceHandle(kind),
    targetHandle: targetHandle(kind),
    className: `edge-${kind}`,
    type: "smoothstep",
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

function sourceHandle(kind: string): string {
  if (kind === "produces") {
    return "source-bottom";
  }
  if (kind === "gates") {
    return "source-top";
  }
  if (kind === "hands_off_to" || kind === "delegates_to") {
    return "source-bottom";
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
    return "target-top";
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
