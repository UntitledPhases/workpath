import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps
} from "@xyflow/react";

import { type SopFlowEdge } from "./flowModel.js";

export function GateSequenceEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data
}: EdgeProps<SopFlowEdge>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });
  const gates = data?.gates ?? [];

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {gates.length ? (
        <EdgeLabelRenderer>
          {gates.map((gate, index) => {
            const offset = (index - (gates.length - 1) / 2) * 28;
            return (
              <button
                aria-label={`Open gate: ${gate.title}`}
                className={[
                  "gate-edge-glyph",
                  `gate-edge-glyph-${gate.gateKind}`,
                  gate.selected ? "is-selected" : "",
                  "nodrag",
                  "nopan"
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={gate.id}
                onClick={(event) => {
                  event.stopPropagation();
                  data?.onSelectGate?.(gate.id);
                }}
                style={{
                  transform: `translate(-50%, -50%) translate(${labelX + offset}px, ${labelY}px) rotate(45deg)`
                }}
                title={gate.title}
                type="button"
              >
                <span className="sr-only">{gate.title}</span>
              </button>
            );
          })}
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
