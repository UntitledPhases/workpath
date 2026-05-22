import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type NodeMouseHandler
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { processSteps, subprocessForStep, type SopGraph } from "../../domain/sop/index.js";
import { GateSequenceEdge } from "./GateSequenceEdge.js";
import { SopNode } from "./SopNode.js";
import { type CanvasScope, type SopFlowNode, toFlowEdges, toFlowNodes } from "./flowModel.js";

const nodeTypes = {
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

function SopCanvasInner({ scope, sop, selectedNodeId, onBackToOverview, onOpenStep, onSelectNode }: SopCanvasProps) {
  const nodes = useMemo(() => toFlowNodes(sop, scope, selectedNodeId), [scope, sop, selectedNodeId]);
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
    onSelectNode(node.id);
  };
  const handleNodeDoubleClick: NodeMouseHandler = (_, node) => {
    const flowNode = node as SopFlowNode;
    if (scope.kind === "overview" && flowNode.data.node.kind === "step" && subprocessForStep(sop, node.id)) {
      onOpenStep(node.id);
    }
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
        onPaneClick={() => onSelectNode(undefined)}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        fitView
        fitViewOptions={{ padding: 0.18 }}
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
