import { Handle, Position, type NodeProps } from "@xyflow/react";

import { type SopFlowNode } from "./flowModel.js";

const CODE_OVERRIDES: Record<string, string> = {
  reverse_pass: "REV",
  review_note: "RVN",
  test_result: "TST",
  tests: "TES"
};

export function SopNode({ data }: NodeProps<SopFlowNode>) {
  const node = data.node;
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
      <div className="node-shape">
        <span className="node-code">{nodeCode(node)}</span>
      </div>
      <div className="node-caption">
        <strong>{node.title}</strong>
        <span>{nodeKindLabel(node)}</span>
      </div>
      {showPrivacy ? <span className={`privacy-chip privacy-${privacy}`}>{privacy}</span> : null}
      <Handle id="source-right" type="source" position={Position.Right} className="node-handle" />
      <Handle id="source-top" type="source" position={Position.Top} className="node-handle" />
      <Handle id="source-bottom" type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
}

function nodeCode(node: SopFlowNode["data"]["node"]): string {
  if (node.kind === "step") {
    return titleCase(node.module);
  }
  if (node.kind === "gate") {
    return compactCode(node.gate_kind);
  }
  if (node.kind === "evidence") {
    return compactCode(node.artifact_kind);
  }
  if (node.kind === "activity") {
    return compactActivityCode(node.title);
  }
  return "BND";
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
  if (node.kind === "activity") {
    return "subprocess";
  }
  return "boundary";
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function compactCode(value: string): string {
  const override = CODE_OVERRIDES[value];
  if (override) {
    return override;
  }
  const parts = value.split("_").filter(Boolean);
  if (parts.length >= 3) {
    return parts
      .slice(0, 3)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }
  return parts
    .map((part) => part.slice(0, parts.length === 1 ? 3 : 2))
    .join("")
    .slice(0, 3)
    .padEnd(3, value[0] ?? "X")
    .toUpperCase();
}

function compactActivityCode(value: string): string {
  return (
    value
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)[0]
      ?.slice(0, 3)
      .padEnd(3, "X")
      .toUpperCase() ?? "ACT"
  );
}
