import { MarkerType, type Edge, type Node } from "@xyflow/react";

import { type PrivacyClassification, type SopGraph, type SopNode } from "../../domain/sop/index.js";

const NODE_DIMENSIONS: Record<SopNode["kind"], { width: number; height: number }> = {
  step: { width: 168, height: 116 },
  gate: { width: 156, height: 126 },
  evidence: { width: 166, height: 116 },
  boundary: { width: 188, height: 116 }
};

export interface SopFlowNodeData extends Record<string, unknown> {
  defaultPrivacy: PrivacyClassification;
  node: SopNode;
  selected: boolean;
}

export type SopFlowNode = Node<SopFlowNodeData>;
export type SopFlowEdge = Edge;

export function toFlowNodes(sop: SopGraph, selectedNodeId?: string): SopFlowNode[] {
  const canvasPositions = new Map(sop.canvas.nodes.map((node) => [node.id, node]));
  return sop.nodes.map((node) => {
    const position = canvasPositions.get(node.id) ?? { x: 0, y: 0 };
    const dimensions = NODE_DIMENSIONS[node.kind];
    return {
      id: node.id,
      type: "sopNode",
      position: { x: position.x, y: position.y },
      data: {
        defaultPrivacy: sop.default_privacy,
        node,
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
  });
}

export function toFlowEdges(sop: SopGraph): SopFlowEdge[] {
  return sop.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    sourceHandle: sourceHandle(edge.kind),
    targetHandle: targetHandle(edge.kind),
    type: "smoothstep",
    animated: edge.kind === "gates",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edgeColor(edge.kind)
    },
    style: {
      stroke: edgeColor(edge.kind),
      strokeWidth: edge.kind === "hands_off_to" ? 2.8 : 2,
      strokeDasharray: edge.kind === "validates" ? "7 5" : undefined
    }
  }));
}

function sourceHandle(kind: string): string {
  if (kind === "gates") {
    return "source-top";
  }
  if (kind === "hands_off_to") {
    return "source-bottom";
  }
  return "source-right";
}

function targetHandle(kind: string): string {
  if (kind === "gates") {
    return "target-bottom";
  }
  if (kind === "hands_off_to") {
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
  return "#64748b";
}
