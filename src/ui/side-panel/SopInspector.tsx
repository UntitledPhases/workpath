import { type ReactNode } from "react";

import {
  type BoundaryNode,
  type EvidenceNode,
  type GateNode,
  type PrivacyClassification,
  type SopGraph,
  type SopNode,
  type SopSelection,
  type StepModule,
  type StepNode,
  type SubprocessNode
} from "../../domain/sop/index.js";

interface SopInspectorProps {
  onAddActivity: (parentStepId: string) => void;
  onDeleteActivity: (parentStepId: string, activityId: string) => void;
  onMoveActivity: (parentStepId: string, activityId: string, direction: -1 | 1) => void;
  onUpdateNode: (nodeId: string, updater: (node: SopNode) => SopNode) => void;
  onUpdateSubprocessNode: (nodeId: string, updater: (node: SubprocessNode) => SubprocessNode) => void;
  sop: SopGraph;
  selection?: SopSelection;
}

const PRIVACY_OPTIONS: Array<PrivacyClassification | ""> = ["", "public", "internal", "sensitive", "secret", "forbidden"];
const MODULE_OPTIONS: StepModule[] = ["intent", "research", "plan", "execute", "verify", "return"];
const GATE_OPTIONS: GateNode["gate_kind"][] = ["reverse_pass", "approval", "tests", "privacy"];

export function SopInspector({
  onAddActivity,
  onDeleteActivity,
  onMoveActivity,
  onUpdateNode,
  onUpdateSubprocessNode,
  sop,
  selection
}: SopInspectorProps) {
  if (!selection) {
    return (
      <aside className="inspector" data-testid="sop-inspector" aria-label="Inspector">
        <div className="inspector-empty">Select a process object to edit it.</div>
      </aside>
    );
  }

  const node = selection.node;
  const parentStepId = selection.parentStepId ?? (node.kind === "step" ? node.id : undefined);
  return (
    <aside className="inspector" data-testid="sop-inspector">
      <div className="inspector-header">
        <span>{profileLabel(selection)}</span>
        <h2>{node.title}</h2>
      </div>
      <p className="inspector-profile-copy">{profileCopy(selection)}</p>
      <details className="metadata-panel">
        <summary>Record details</summary>
        <dl>
          <Meta label="id" value={node.id} />
          <Meta label="privacy" value={"privacy" in node && node.privacy ? node.privacy : sop.default_privacy} />
          {selection.parentStepId && node.kind !== "step" ? <Meta label="parent_step" value={selection.parentStepId} /> : null}
          {node.notes ? <Meta label="notes" value={node.notes} /> : null}
          {node.kind === "step" ? <Meta label="module" value={node.module} /> : null}
          {node.kind === "activity" ? <Meta label="role" value="nested process" /> : null}
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
      </details>
      <div className="inspector-editor">
        {selection.kind === "sop_node" ? (
          <NodeEditor
            node={selection.node}
            onUpdate={(updater) => onUpdateNode(selection.node.id, updater)}
            sop={sop}
          />
        ) : (
          <ActivityEditor
            node={selection.node}
            onDeleteActivity={onDeleteActivity}
            onMoveActivity={onMoveActivity}
            onUpdate={(updater) => onUpdateSubprocessNode(selection.node.id, updater)}
            parentStepId={selection.parentStepId}
          />
        )}
        {parentStepId ? (
          <button className="secondary-action" type="button" onClick={() => onAddActivity(parentStepId)}>
            Add activity
          </button>
        ) : null}
      </div>
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

function profileLabel(selection: SopSelection): string {
  if (selection.kind === "subprocess_node") {
    return "operation";
  }
  if (selection.node.kind === "gate") {
    return "review gate";
  }
  if (selection.node.kind === "boundary") {
    return "handoff packet";
  }
  if (selection.node.kind === "evidence") {
    return "evidence";
  }
  return "process step";
}

function profileCopy(selection: SopSelection): string {
  if (selection.kind === "subprocess_node") {
    return "A concrete operation inside the selected process step.";
  }
  if (selection.node.kind === "gate") {
    return "A review stop that requires evidence before downstream work proceeds.";
  }
  if (selection.node.kind === "boundary") {
    return "A scoped handoff packet for another agent, person, or system.";
  }
  if (selection.node.kind === "evidence") {
    return "A required proof item that the workflow can collect or verify.";
  }
  return "A top-level phase in the operating process.";
}

function NodeEditor({
  node,
  onUpdate,
  sop
}: {
  node: SopNode;
  onUpdate: (updater: (node: SopNode) => SopNode) => void;
  sop: SopGraph;
}) {
  return (
    <div className="editor-form" aria-label="Node editor">
      <TextField label="title" maxLength={24} value={node.title} onChange={(title) => onUpdate((current) => ({ ...current, title }))} />
      <TextArea label="purpose" value={node.notes ?? ""} onChange={(notes) => onUpdate((current) => ({ ...current, notes: optional(notes) }))} />
      {node.kind === "step" ? <StepFields node={node} onUpdate={onUpdate} /> : null}
      {node.kind === "evidence" ? <EvidenceFields node={node} onUpdate={onUpdate} /> : null}
      {node.kind === "gate" ? <GateFields node={node} onUpdate={onUpdate} sop={sop} /> : null}
      {node.kind === "boundary" ? <BoundaryFields node={node} onUpdate={onUpdate} sop={sop} /> : null}
      <AdvancedFields label="Privacy">
        <PrivacyField value={node.privacy ?? ""} onChange={(privacy) => onUpdate((current) => ({ ...current, privacy }))} />
      </AdvancedFields>
    </div>
  );
}

function ActivityEditor({
  node,
  onDeleteActivity,
  onMoveActivity,
  onUpdate,
  parentStepId
}: {
  node: SubprocessNode;
  onDeleteActivity: (parentStepId: string, activityId: string) => void;
  onMoveActivity: (parentStepId: string, activityId: string, direction: -1 | 1) => void;
  onUpdate: (updater: (node: SubprocessNode) => SubprocessNode) => void;
  parentStepId: string;
}) {
  return (
    <div className="editor-form" aria-label="Activity editor">
      <TextField label="title" maxLength={24} value={node.title} onChange={(title) => onUpdate((current) => ({ ...current, title }))} />
      <TextArea label="purpose" value={node.notes ?? ""} onChange={(notes) => onUpdate((current) => ({ ...current, notes: optional(notes) }))} />
      <div className="inline-actions">
        <button type="button" onClick={() => onMoveActivity(parentStepId, node.id, -1)}>
          Move left
        </button>
        <button type="button" onClick={() => onMoveActivity(parentStepId, node.id, 1)}>
          Move right
        </button>
        <button type="button" onClick={() => onDeleteActivity(parentStepId, node.id)}>
          Delete
        </button>
      </div>
      <AdvancedFields label="Privacy">
        <PrivacyField value={node.privacy ?? ""} onChange={(privacy) => onUpdate((current) => ({ ...current, privacy }))} />
      </AdvancedFields>
    </div>
  );
}

function StepFields({ node, onUpdate }: { node: StepNode; onUpdate: (updater: (node: SopNode) => SopNode) => void }) {
  return (
    <label className="field">
      <span>module</span>
      <select
        value={node.module}
        onChange={(event) => onUpdate((current) => ({ ...(current as StepNode), module: event.target.value as StepModule }))}
      >
        {MODULE_OPTIONS.map((module) => (
          <option key={module} value={module}>
            {module}
          </option>
        ))}
      </select>
    </label>
  );
}

function EvidenceFields({
  node,
  onUpdate
}: {
  node: EvidenceNode;
  onUpdate: (updater: (node: SopNode) => SopNode) => void;
}) {
  return (
    <>
      <label className="checkbox-field">
        <input
          checked={node.required}
          type="checkbox"
          onChange={(event) => onUpdate((current) => ({ ...(current as EvidenceNode), required: event.target.checked }))}
        />
        required
      </label>
      <TextField
        label="command"
        value={node.command ?? ""}
        onChange={(command) => onUpdate((current) => ({ ...(current as EvidenceNode), command: optional(command) }))}
      />
      <AdvancedFields>
        <TextField
          label="artifact_kind"
          value={node.artifact_kind}
          onChange={(artifact_kind) => onUpdate((current) => ({ ...(current as EvidenceNode), artifact_kind }))}
        />
      </AdvancedFields>
    </>
  );
}

function GateFields({
  node,
  onUpdate,
  sop
}: {
  node: GateNode;
  onUpdate: (updater: (node: SopNode) => SopNode) => void;
  sop: SopGraph;
}) {
  const steps = sop.nodes.filter((candidate): candidate is StepNode => candidate.kind === "step");
  return (
    <>
      <label className="field">
        <span>gate_kind</span>
        <select
          value={node.gate_kind}
          onChange={(event) =>
            onUpdate((current) => ({ ...(current as GateNode), gate_kind: event.target.value as GateNode["gate_kind"] }))
          }
        >
          {GATE_OPTIONS.map((gate) => (
            <option key={gate} value={gate}>
              {gate}
            </option>
          ))}
        </select>
      </label>
      <TextField
        label="required_evidence"
        value={node.required_evidence.join(", ")}
        onChange={(value) => onUpdate((current) => ({ ...(current as GateNode), required_evidence: csv(value) }))}
      />
      <AdvancedFields>
        <StepSelect label="task_id" onUpdate={onUpdate} steps={steps} value={node.task_id} />
      </AdvancedFields>
    </>
  );
}

function BoundaryFields({
  node,
  onUpdate,
  sop
}: {
  node: BoundaryNode;
  onUpdate: (updater: (node: SopNode) => SopNode) => void;
  sop: SopGraph;
}) {
  const steps = sop.nodes.filter((candidate): candidate is StepNode => candidate.kind === "step");
  return (
    <>
      <TextArea
        label="objective"
        value={node.objective}
        onChange={(objective) => onUpdate((current) => ({ ...(current as BoundaryNode), objective }))}
      />
      <TextField
        label="allowed_paths"
        value={node.allowed_paths.join(", ")}
        onChange={(value) => onUpdate((current) => ({ ...(current as BoundaryNode), allowed_paths: csv(value) }))}
      />
      <TextField
        label="return_contract"
        value={node.return_contract.required_fields.join(", ")}
        onChange={(value) =>
          onUpdate((current) => ({
            ...(current as BoundaryNode),
            return_contract: { required_fields: csv(value) }
          }))
        }
      />
      <AdvancedFields>
        <StepSelect label="task_id" onUpdate={onUpdate} steps={steps} value={node.task_id} />
        <TextField label="to" value={node.to} onChange={(to) => onUpdate((current) => ({ ...(current as BoundaryNode), to }))} />
        <TextField
          label="denied_paths"
          value={node.denied_paths.join(", ")}
          onChange={(value) => onUpdate((current) => ({ ...(current as BoundaryNode), denied_paths: csv(value) }))}
        />
        <TextField
          label="evidence_required"
          value={node.evidence_required.join(", ")}
          onChange={(value) => onUpdate((current) => ({ ...(current as BoundaryNode), evidence_required: csv(value) }))}
        />
      </AdvancedFields>
    </>
  );
}

function StepSelect({
  label,
  onUpdate,
  steps,
  value
}: {
  label: string;
  onUpdate: (updater: (node: SopNode) => SopNode) => void;
  steps: StepNode[];
  value: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) =>
          onUpdate((current) =>
            current.kind === "gate" || current.kind === "boundary"
              ? {
                  ...current,
                  task_id: event.target.value
                }
              : current
          )
        }
      >
        {steps.map((step) => (
          <option key={step.id} value={step.id}>
            {step.title}
          </option>
        ))}
      </select>
    </label>
  );
}

function AdvancedFields({ children, label = "Advanced" }: { children: ReactNode; label?: string }) {
  return (
    <details className="advanced-fields">
      <summary>{label}</summary>
      <div className="advanced-fields-body">{children}</div>
    </details>
  );
}

function PrivacyField({
  onChange,
  value
}: {
  onChange: (privacy: PrivacyClassification | undefined) => void;
  value: PrivacyClassification | "";
}) {
  return (
    <label className="field">
      <span>privacy</span>
      <select value={value} onChange={(event) => onChange(optional(event.target.value) as PrivacyClassification | undefined)}>
        {PRIVACY_OPTIONS.map((privacy) => (
          <option key={privacy || "inherit"} value={privacy}>
            {privacy || "inherit"}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  maxLength,
  onChange,
  value
}: {
  label: string;
  maxLength?: number;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function csv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
