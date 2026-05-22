import { type NodeProps } from "@xyflow/react";

import { type ProcessFrameFlowNode } from "./flowModel.js";

export function ProcessFrameNode({ data }: NodeProps<ProcessFrameFlowNode>) {
  return (
    <section
      aria-label={`Nested process: ${data.title}`}
      className={`process-frame process-frame-${data.module}`}
      role="group"
    >
      <header className="process-frame-header">
        <span>{data.title}</span>
      </header>
    </section>
  );
}
