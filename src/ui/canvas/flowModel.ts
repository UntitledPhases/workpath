import { MarkerType, type Edge, type Node } from "@xyflow/react";

import { type SopGraph, type SopNode } from "../../domain/sop/index.js";

export interface SopFlowNodeData extends Record<string, unknown> {
  node: SopNode;
  selected: boolean;
}

export type SopFlowNode = Node<SopFlowNodeData>;
export type SopFlowEdge = Edge;

export function toFlowNodes(sop: SopGraph, selectedNodeId?: string): SopFlowNode[] {
  const canvasPositions = new Map(sop.canvas.nodes.map((node) => [node.id, node]));
  return sop.nodes.map((node) => {
    const position = canvasPositions.get(node.id) ?? { x: 0, y: 0 };
    return {
      id: node.id,
      type: "sopNode",
      position: { x: position.x, y: position.y },
      data: {
        node,
        selected: node.id === selectedNodeId
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
    type: "smoothstep",
    label: edge.kind.replaceAll("_", " "),
    animated: edge.kind === "gates",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edgeColor(edge.kind)
    },
    style: {
      stroke: edgeColor(edge.kind),
      strokeWidth: edge.kind === "hands_off_to" ? 2.8 : 2,
      strokeDasharray: edge.kind === "validates" ? "7 5" : undefined
    },
    labelStyle: {
      fill: "#475569",
      fontSize: 11,
      fontWeight: 600
    },
    labelBgStyle: {
      fill: "#f8fafc",
      fillOpacity: 0.92
    }
  }));
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

