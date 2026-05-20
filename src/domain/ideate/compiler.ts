import {
  type BoundaryNode,
  type EvidenceNode,
  type GateNode,
  type PrivacyClassification,
  type SopGraph,
  type StepNode,
  sopGraphSchema
} from "../sop/schema.js";
import {
  type IdeateArtifact,
  type IdeateHandoff,
  type IdeatePrivacyBoundary,
  type IdeateRecord,
  type IdeateReviewGate,
  type IdeateTask,
  ideateRecordSchema
} from "./schema.js";

export const IDEATE_FILES = [
  "tasks.jsonl",
  "events.jsonl",
  "artifacts.jsonl",
  "handoffs.jsonl",
  "review_gates.jsonl",
  "returns.jsonl",
  "ownership_claims.jsonl",
  "privacy_boundaries.jsonl",
  "memory_candidates.jsonl"
] as const;

export type IdeateFileName = (typeof IDEATE_FILES)[number];

export type IdeateBundle = Record<IdeateFileName, IdeateRecord[]>;

export interface CompileOptions {
  createdAt?: string;
  compilerVersion?: string;
  exportMode?: "specification";
}

interface CompileContext {
  sop: SopGraph;
  createdAt: string;
  compilerVersion: string;
  exportMode: "specification";
}

export function compileToIdeateBundle(input: unknown, options: CompileOptions = {}): IdeateBundle {
  const sop = sopGraphSchema.parse(input);
  const context: CompileContext = {
    sop,
    createdAt: options.createdAt ?? new Date().toISOString(),
    compilerVersion: options.compilerVersion ?? "workpath-compiler@0.1.0",
    exportMode: options.exportMode ?? "specification"
  };
  const bundle = emptyBundle();
  const steps = sop.nodes.filter((node): node is StepNode => node.kind === "step");
  const gates = sop.nodes.filter((node): node is GateNode => node.kind === "gate");
  const evidence = sop.nodes.filter((node): node is EvidenceNode => node.kind === "evidence");
  const boundaries = sop.nodes.filter((node): node is BoundaryNode => node.kind === "boundary");

  for (const step of steps) {
    bundle["tasks.jsonl"].push(compileStep(context, step));
  }
  for (const artifact of evidence) {
    bundle["artifacts.jsonl"].push(compileEvidence(context, artifact));
  }
  for (const gate of gates) {
    bundle["review_gates.jsonl"].push(compileGate(context, gate));
  }
  for (const boundary of boundaries) {
    bundle["handoffs.jsonl"].push(compileBoundary(context, boundary));
  }
  bundle["privacy_boundaries.jsonl"].push(compilePrivacyBoundary(context));

  for (const records of Object.values(bundle)) {
    for (const record of records) {
      ideateRecordSchema.parse(record);
    }
  }
  return bundle;
}

export function emptyBundle(): IdeateBundle {
  return {
    "tasks.jsonl": [],
    "events.jsonl": [],
    "artifacts.jsonl": [],
    "handoffs.jsonl": [],
    "review_gates.jsonl": [],
    "returns.jsonl": [],
    "ownership_claims.jsonl": [],
    "privacy_boundaries.jsonl": [],
    "memory_candidates.jsonl": []
  };
}

function compileStep(context: CompileContext, step: StepNode): IdeateTask {
  const dependsOn = context.sop.edges
    .filter((edge) => edge.kind === "produces" && edge.to === step.id)
    .map((edge) => edge.from)
    .filter((nodeId) => nodeById(context.sop, nodeId)?.kind === "step")
    .sort();
  const reviewGateIds = context.sop.edges
    .filter((edge) => edge.kind === "gates" && edge.to === step.id)
    .map((edge) => edge.from)
    .filter((nodeId) => nodeById(context.sop, nodeId)?.kind === "gate")
    .sort();

  return {
    ...baseRecord(context, "task", step.id, step.privacy),
    artifact_type: "task",
    title: step.title,
    status: "planned",
    module: step.module,
    depends_on: dependsOn,
    review_gate_ids: reviewGateIds
  };
}

function compileEvidence(context: CompileContext, evidence: EvidenceNode): IdeateArtifact {
  const status = evidence.required ? "passed" : undefined;
  return {
    ...baseRecord(context, "artifact", evidence.id, evidence.privacy),
    artifact_type: "artifact",
    artifact_kind: evidence.artifact_kind,
    required: evidence.required,
    ...(status ? { status } : {}),
    ...(evidence.command ? { command: evidence.command } : {})
  };
}

function compileGate(context: CompileContext, gate: GateNode): IdeateReviewGate {
  const evidence = context.sop.edges
    .filter((edge) => edge.kind === "validates" && edge.to === gate.id)
    .map((edge) => edge.from)
    .filter((nodeId) => nodeById(context.sop, nodeId)?.kind === "evidence")
    .sort();
  return {
    ...baseRecord(context, "review_gate", gate.id, gate.privacy),
    artifact_type: "review_gate",
    task_id: gate.task_id,
    gate_type: gate.gate_kind,
    status: "passed",
    required_evidence: gate.required_evidence,
    evidence
  };
}

function compileBoundary(context: CompileContext, boundary: BoundaryNode): IdeateHandoff {
  return {
    ...baseRecord(context, "handoff", boundary.id, boundary.privacy),
    artifact_type: "handoff",
    task_id: boundary.task_id,
    from: "workpath-author",
    to: boundary.to,
    objective: boundary.objective,
    allowed_paths: boundary.allowed_paths,
    denied_paths: boundary.denied_paths,
    return_contract: boundary.return_contract,
    evidence_required: boundary.evidence_required
  };
}

function compilePrivacyBoundary(context: CompileContext): IdeatePrivacyBoundary {
  return {
    ...baseRecord(context, "privacy_boundary", `privacy_${context.sop.id}`, context.sop.default_privacy),
    artifact_type: "privacy_boundary",
    scope: "single-node SOP export",
    policy: "Do not persist secrets, credentials, raw transcripts, private absolute paths, or bulky logs."
  };
}

function baseRecord(
  context: CompileContext,
  sourceType: string,
  id: string,
  privacy?: PrivacyClassification
) {
  return {
    schema_version: "1.0" as const,
    id,
    created_at: context.createdAt,
    provenance: {
      source: "workpath",
      actor: context.compilerVersion,
      sop_id: context.sop.id,
      source_type: sourceType
    },
    workpath_export_mode: context.exportMode,
    privacy_classification: privacy ?? context.sop.default_privacy
  };
}

function nodeById(sop: SopGraph, id: string) {
  return sop.nodes.find((node) => node.id === id);
}
