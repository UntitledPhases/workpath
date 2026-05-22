import { Handle, Position, type NodeProps } from "@xyflow/react";

import { type SopFlowNode } from "./flowModel.js";

export function SopNode({ data }: NodeProps<SopFlowNode>) {
  const node = data.node;
  const showTitle = node.kind === "step" || node.kind === "activity" || node.kind === "boundary";
  const className = [
    "sop-node",
    `sop-node-${node.kind}`,
    `sop-node-layer-${data.layer}`,
    node.kind === "step" ? `module-${node.module}` : "",
    data.selected ? "is-selected" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const privacy = "privacy" in node && node.privacy ? node.privacy : "internal";
  const showPrivacy = "privacy" in node && node.privacy && node.privacy !== data.defaultPrivacy;

  return (
    <div
      className={className}
      data-testid={`sop-node-${node.kind}`}
      role="button"
      aria-label={`${node.kind}: ${node.title}`}
      aria-pressed={data.selected}
    >
      <Handle id="target-left" type="target" position={Position.Left} className="node-handle" />
      <Handle id="target-top" type="target" position={Position.Top} className="node-handle" />
      <Handle id="target-bottom" type="target" position={Position.Bottom} className="node-handle" />
      <div className={`node-shape ${showTitle ? "has-title" : "is-symbol-only"}`} title={node.title}>
        {showTitle ? <span className="node-title">{node.title}</span> : <span className="sr-only">{node.title}</span>}
      </div>
      {showPrivacy ? <span className={`privacy-chip privacy-${privacy}`}>{privacy}</span> : null}
      <Handle id="source-right" type="source" position={Position.Right} className="node-handle" />
      <Handle id="source-top" type="source" position={Position.Top} className="node-handle" />
      <Handle id="source-bottom" type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
}
