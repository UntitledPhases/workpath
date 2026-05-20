import { Handle, Position, type NodeProps } from "@xyflow/react";

import { type SopFlowNode } from "./flowModel.js";

export function SopNode({ data }: NodeProps<SopFlowNode>) {
  const node = data.node;
  const className = [
    "sop-node",
    `sop-node-${node.kind}`,
    node.kind === "step" ? `module-${node.module}` : "",
    data.selected ? "is-selected" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const privacy = "privacy" in node && node.privacy ? node.privacy : "internal";

  return (
    <div
      className={className}
      data-testid={`sop-node-${node.kind}`}
      role="button"
      aria-label={`${node.kind}: ${node.title}`}
      aria-pressed={data.selected}
    >
      <Handle type="target" position={Position.Left} className="node-handle" />
      <div className="node-shape">
        <span className="node-code">{nodeCode(node)}</span>
      </div>
      <div className="node-caption">
        <strong>{node.title}</strong>
        <span>{nodeKindLabel(node)}</span>
      </div>
      <span className={`privacy-chip privacy-${privacy}`}>{privacy}</span>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
}

function nodeCode(node: SopFlowNode["data"]["node"]): string {
  if (node.kind === "step") {
    return node.module.slice(0, 2).toUpperCase();
  }
  if (node.kind === "gate") {
    return "G";
  }
  if (node.kind === "evidence") {
    return "E";
  }
  return "B";
}

function nodeKindLabel(node: SopFlowNode["data"]["node"]): string {
  if (node.kind === "step") {
    return node.module;
  }
  if (node.kind === "gate") {
    return node.gate_kind;
  }
  if (node.kind === "evidence") {
    return node.artifact_kind;
  }
  return "boundary";
}
