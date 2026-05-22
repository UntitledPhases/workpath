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

import { activeStepIdForSelection, processSteps, type SopGraph } from "../../domain/sop/index.js";
import { GateSequenceEdge } from "./GateSequenceEdge.js";
import { SopNode } from "./SopNode.js";
import { toFlowEdges, toFlowNodes } from "./flowModel.js";

const nodeTypes = {
  sopNode: SopNode
};

const edgeTypes = {
  gateSequence: GateSequenceEdge
};

interface SopCanvasProps {
  sop: SopGraph;
  selectedNodeId?: string;
  onSelectNode: (nodeId?: string) => void;
}

export function SopCanvas(props: SopCanvasProps) {
  return (
    <ReactFlowProvider>
      <SopCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function SopCanvasInner({ sop, selectedNodeId, onSelectNode }: SopCanvasProps) {
  const nodes = useMemo(() => toFlowNodes(sop, selectedNodeId), [sop, selectedNodeId]);
  const edges = useMemo(
    () =>
      toFlowEdges(sop, selectedNodeId).map((edge) =>
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
    [onSelectNode, sop, selectedNodeId]
  );
  const activeStepId = activeStepIdForSelection(sop, selectedNodeId);
  const activeStep = activeStepId ? processSteps(sop).find((node) => node.id === activeStepId) : undefined;
  const handleNodeClick: NodeMouseHandler = (_, node) => {
    onSelectNode(node.id);
  };

  return (
    <div className="canvas-shell" data-testid="sop-canvas">
      <div className="canvas-layer-badges" aria-hidden="true">
        <span>Overview</span>
        {activeStep ? <span>Detail: {activeStep.title}</span> : null}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
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
