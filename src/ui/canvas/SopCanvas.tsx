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

import { type SopGraph } from "../../domain/sop/index.js";
import { SopNode } from "./SopNode.js";
import { toFlowEdges, toFlowNodes } from "./flowModel.js";

const nodeTypes = {
  sopNode: SopNode
};

interface SopCanvasProps {
  sop: SopGraph;
  selectedNodeId?: string;
  onSelectNode: (nodeId: string) => void;
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
  const edges = useMemo(() => toFlowEdges(sop), [sop]);
  const handleNodeClick: NodeMouseHandler = (_, node) => {
    onSelectNode(node.id);
  };

  return (
    <div className="canvas-shell" data-testid="sop-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
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
