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
const PROCESS_FRAME_PREFIX = "process-frame:";
const FRAME_PADDING_X = 120;
const FRAME_PADDING_TOP = 118;
const FRAME_PADDING_BOTTOM = 104;

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
  onOpenStep?: (stepId: string) => void;
  parentStepId?: string;
  selected: boolean;
}

export interface ProcessFrameNodeData extends Record<string, unknown> {
  module: string;
  stepId: string;
  title: string;
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
export type ProcessFrameFlowNode = Node<ProcessFrameNodeData>;
export type WorkpathFlowNode = SopFlowNode | ProcessFrameFlowNode;
export type SopFlowEdge = Edge<SopFlowEdgeData>;

export function toFlowNodes(sop: SopGraph, scope: CanvasScope, selectedNodeId?: string): WorkpathFlowNode[] {
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

  const parentStep = processSteps(sop).find((node) => node.id === scope.stepId);
  const dockedGateIds = gateIdsFromBadges(gateBadgesBySequenceEdge(sop, subprocess, selectedNodeId));
  const detailPositions = new Map(subprocess.canvas.nodes.map((node) => [node.id, node]));
  const renderedItems = [
    ...subprocess.nodes.map((node) => ({ layer: "detail" as const, node })),
    ...attachedNodesForStep(sop, scope.stepId)
      .filter((node) => !(node.kind === "gate" && dockedGateIds.has(node.id)))
      .map((node) => ({ layer: "attachment" as const, node }))
  ];
  const frameLayout = nestedProcessFrameLayout(renderedItems, detailPositions, canvasPositions);
  const frameId = processFrameId(scope.stepId);
  const nodes: WorkpathFlowNode[] = parentStep
    ? [toProcessFrameNode(frameId, parentStep.title, parentStep.module, frameLayout.width, frameLayout.height)]
    : [];

  for (const node of subprocess.nodes) {
    const sourcePosition = detailPositions.get(node.id) ?? { x: 0, y: 0 };
    nodes.push(
      toFlowNode(
        sop,
        node,
        "detail",
        frameLayout.toFramePosition(sourcePosition),
        selectedNodeId,
        scope.stepId,
        frameId
      )
    );
  }

  for (const node of attachedNodesForStep(sop, scope.stepId)) {
    if (node.kind === "gate" && dockedGateIds.has(node.id)) {
      continue;
    }
    const sourcePosition = detailPositions.get(node.id) ?? canvasPositions.get(node.id) ?? { x: 0, y: 0 };
    nodes.push(
      toFlowNode(
        sop,
        node,
        "attachment",
        frameLayout.toFramePosition(sourcePosition),
        selectedNodeId,
        scope.stepId,
        frameId
      )
    );
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
  parentStepId?: string,
  frameId?: string
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
    parentId: frameId,
    extent: frameId ? "parent" : undefined,
    draggable: false,
    selectable: true
  };
}

function toProcessFrameNode(
  id: string,
  title: string,
  module: string,
  width: number,
  height: number
): ProcessFrameFlowNode {
  return {
    id,
    type: "processFrame",
    position: { x: 0, y: 0 },
    data: {
      module,
      stepId: id.replace(PROCESS_FRAME_PREFIX, ""),
      title
    },
    initialWidth: width,
    initialHeight: height,
    selectable: false,
    draggable: false,
    style: {
      width,
      height
    },
    zIndex: -1
  };
}

function nestedProcessFrameLayout(
  items: Array<{ layer: FlowLayer; node: FlowDisplayNode }>,
  detailPositions: Map<string, { x: number; y: number }>,
  canvasPositions: Map<string, { x: number; y: number }>
): {
  height: number;
  toFramePosition: (position: { x: number; y: number }) => { x: number; y: number };
  width: number;
} {
  if (!items.length) {
    return {
      height: 360,
      toFramePosition: (position) => ({
        x: position.x + FRAME_PADDING_X,
        y: position.y + FRAME_PADDING_TOP
      }),
      width: 760
    };
  }

  const bounds = items.reduce(
    (current, item) => {
      const position = detailPositions.get(item.node.id) ?? canvasPositions.get(item.node.id) ?? { x: 0, y: 0 };
      const dimensions = nodeDimensions(item.node.kind, item.layer);
      return {
        maxX: Math.max(current.maxX, position.x + dimensions.width),
        maxY: Math.max(current.maxY, position.y + dimensions.height),
        minX: Math.min(current.minX, position.x),
        minY: Math.min(current.minY, position.y)
      };
    },
    { maxX: -Infinity, maxY: -Infinity, minX: Infinity, minY: Infinity }
  );

  return {
    height: bounds.maxY - bounds.minY + FRAME_PADDING_TOP + FRAME_PADDING_BOTTOM,
    toFramePosition: (position) => ({
      x: position.x - bounds.minX + FRAME_PADDING_X,
      y: position.y - bounds.minY + FRAME_PADDING_TOP
    }),
    width: bounds.maxX - bounds.minX + FRAME_PADDING_X * 2
  };
}

function processFrameId(stepId: string): string {
  return `${PROCESS_FRAME_PREFIX}${stepId}`;
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
