import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type OnNodeDrag,
  type NodeMouseHandler
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { processSteps, subprocessForStep, type SopGraph } from "../../domain/sop/index.js";
import { GateSequenceEdge } from "./GateSequenceEdge.js";
import { ProcessFrameNode } from "./ProcessFrameNode.js";
import { SopNode } from "./SopNode.js";
import { type CanvasScope, type SopFlowNode, toFlowEdges, toFlowNodes } from "./flowModel.js";

const nodeTypes = {
  processFrame: ProcessFrameNode,
  sopNode: SopNode
};

const edgeTypes = {
  gateSequence: GateSequenceEdge
};

interface SopCanvasProps {
  scope: CanvasScope;
  sop: SopGraph;
  selectedNodeId?: string;
  onBackToOverview: () => void;
  onMoveNode: (nodeId: string, position: { x: number; y: number }, parentStepId?: string) => void;
  onOpenStep: (stepId: string) => void;
  onSelectNode: (nodeId?: string) => void;
}

export function SopCanvas(props: SopCanvasProps) {
  return (
    <ReactFlowProvider>
      <SopCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function SopCanvasInner({
  scope,
  sop,
  selectedNodeId,
  onBackToOverview,
  onMoveNode,
  onOpenStep,
  onSelectNode
}: SopCanvasProps) {
  const nodes = useMemo(
    () =>
      toFlowNodes(sop, scope, selectedNodeId).map((node) => {
        if (isSopFlowNode(node) && node.data.node.kind === "step" && subprocessForStep(sop, node.id)) {
          return {
            ...node,
            data: {
              ...node.data,
              onOpenStep
            }
          };
        }
        return node;
      }),
    [onOpenStep, scope, sop, selectedNodeId]
  );
  const edges = useMemo(
    () =>
      toFlowEdges(sop, scope, selectedNodeId).map((edge) =>
        edge.data?.gates?.length
          ? {
              ...edge,
              data: {
                ...edge.data,
                onSelectGate: onSelectNode
              }
            }
          : edge
      ),
    [onSelectNode, scope, sop, selectedNodeId]
  );
  const selectedStep =
    scope.kind === "overview"
      ? processSteps(sop).find((node) => node.id === selectedNodeId && subprocessForStep(sop, node.id))
      : undefined;
  const activeStep = scope.kind === "subprocess" ? processSteps(sop).find((node) => node.id === scope.stepId) : undefined;
  const handleNodeClick: NodeMouseHandler = (_, node) => {
    if (isSopFlowNode(node)) {
      onSelectNode(node.id);
    }
  };
  const handleNodeDoubleClick: NodeMouseHandler = (_, node) => {
    if (
      scope.kind === "overview" &&
      isSopFlowNode(node) &&
      node.data.node.kind === "step" &&
      subprocessForStep(sop, node.id)
    ) {
      onOpenStep(node.id);
    }
  };
  const handleNodeDragStop: OnNodeDrag = (_, node) => {
    if (!isSopFlowNode(node)) {
      return;
    }
    onMoveNode(
      node.id,
      {
        x: node.position.x - node.data.sourcePositionOffset.x,
        y: node.position.y - node.data.sourcePositionOffset.y
      },
      node.data.layer === "overview" ? undefined : node.data.parentStepId
    );
  };

  return (
    <div className={`canvas-shell canvas-shell-${scope.kind}`} data-testid="sop-canvas">
      <div className="canvas-breadcrumb" aria-label="Canvas view">
        {scope.kind === "subprocess" ? (
          <button type="button" onClick={onBackToOverview}>
            Project SOP
          </button>
        ) : (
          <span>Project SOP</span>
        )}
        {activeStep ? (
          <>
            <span aria-hidden="true">/</span>
            <span>{activeStep.title}</span>
          </>
        ) : null}
        {selectedStep ? (
          <button type="button" onClick={() => onOpenStep(selectedStep.id)}>
            Open {selectedStep.title}
          </button>
        ) : null}
      </div>
      <ReactFlow
        key={scope.kind === "overview" ? "overview" : `subprocess-${scope.stepId}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={() => onSelectNode(undefined)}
        nodesDraggable
        nodesConnectable={false}
        edgesFocusable={false}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        zoomOnDoubleClick={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="#cbd5e1" />
        <MiniMap
          nodeStrokeWidth={3}
          pannable
          zoomable
          nodeColor={(node) => {
            const kind = String(node.data?.node && typeof node.data.node === "object" ? (node.data.node as { kind?: string }).kind : "");
            if (kind === "gate") return "#f59e0b";
            if (kind === "evidence") return "#06b6d4";
            if (kind === "boundary") return "#8b5cf6";
            return "#22c55e";
          }}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

function isSopFlowNode(node: { data?: Record<string, unknown>; type?: string }): node is SopFlowNode {
  return node.type === "sopNode" && typeof node.data?.node === "object" && node.data.node !== null;
}
