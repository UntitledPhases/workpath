import { type SopGraph, type SopSelection } from "../../domain/sop/index.js";

interface SopInspectorProps {
  sop: SopGraph;
  selection?: SopSelection;
}

export function SopInspector({ sop, selection }: SopInspectorProps) {
  if (!selection) {
    return <aside className="inspector" data-testid="sop-inspector" aria-label="Inspector" />;
  }

  const node = selection.node;
  return (
    <aside className="inspector" data-testid="sop-inspector">
      <div className="inspector-header">
        <span>{selection.kind === "subprocess_node" ? "activity" : node.kind}</span>
        <h2>{node.title}</h2>
      </div>
      <dl>
        <Meta label="id" value={node.id} />
        <Meta label="privacy" value={"privacy" in node && node.privacy ? node.privacy : sop.default_privacy} />
        {selection.parentStepId && node.kind !== "step" ? <Meta label="parent_step" value={selection.parentStepId} /> : null}
        {node.notes ? <Meta label="notes" value={node.notes} /> : null}
        {node.kind === "step" ? <Meta label="module" value={node.module} /> : null}
        {node.kind === "activity" ? <Meta label="role" value="subprocess" /> : null}
        {node.kind === "gate" ? (
          <>
            <Meta label="gate" value={node.gate_kind} />
            <Meta label="task" value={node.task_id} />
            <Meta label="evidence" value={node.required_evidence.join(", ")} />
          </>
        ) : null}
        {node.kind === "evidence" ? (
          <>
            <Meta label="artifact" value={node.artifact_kind} />
            <Meta label="required" value={String(node.required)} />
            {node.command ? <Meta label="command" value={node.command} /> : null}
          </>
        ) : null}
        {node.kind === "boundary" ? (
          <>
            <Meta label="task" value={node.task_id} />
            <Meta label="to" value={node.to} />
            <Meta label="objective" value={node.objective} />
            <Meta label="allowed_paths" value={node.allowed_paths.join(", ")} />
            <Meta label="denied_paths" value={node.denied_paths.join(", ")} />
            <Meta label="return_contract" value={node.return_contract.required_fields.join(", ")} />
            <Meta label="evidence_required" value={node.evidence_required.join(", ")} />
          </>
        ) : null}
      </dl>
    </aside>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
