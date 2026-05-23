import { z } from "zod";

import {
  type BoundaryNode,
  type EvidenceNode,
  type GateNode,
  type PrivacyClassification,
  type SopGraph,
  type SopNode,
  type SopSubprocess,
  type StepNode,
  type SubprocessEdge,
  type SubprocessNode,
  sopGraphSchema
} from "../sop/index.js";

const programEdgeKindSchema = z.enum([
  "sequence",
  "produces",
  "validates",
  "guards",
  "delegates_to",
  "hands_off_to"
]);

const programNodeBaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  privacy: z.string().min(1),
  notes: z.string().optional()
});

const processStepProgramNodeSchema = programNodeBaseSchema.extend({
  kind: z.literal("process_step"),
  module: z.string().min(1),
  nested_process_id: z.string().min(1).optional(),
  review_gate_ids: z.array(z.string()).default([]),
  handoff_ids: z.array(z.string()).default([])
});

const reviewGateProgramNodeSchema = programNodeBaseSchema.extend({
  kind: z.literal("review_gate"),
  gate_type: z.string().min(1),
  task_id: z.string().min(1),
  required_evidence: z.array(z.string()).min(1)
});

const evidenceProgramNodeSchema = programNodeBaseSchema.extend({
  kind: z.literal("evidence_requirement"),
  artifact_kind: z.string().min(1),
  required: z.boolean(),
  command: z.string().optional()
});

const handoffProgramNodeSchema = programNodeBaseSchema.extend({
  kind: z.literal("handoff_packet"),
  task_id: z.string().min(1),
  to: z.string().min(1),
  objective: z.string().min(1),
  allowed_paths: z.array(z.string()).min(1),
  denied_paths: z.array(z.string()).default([]),
  return_contract: z.object({
    required_fields: z.array(z.string()).min(1)
  }),
  evidence_required: z.array(z.string()).min(1)
});

const operationProgramNodeSchema = programNodeBaseSchema.extend({
  kind: z.literal("operation"),
  operation_kind: z.literal("activity")
});

export const workflowProgramNodeSchema = z.discriminatedUnion("kind", [
  processStepProgramNodeSchema,
  reviewGateProgramNodeSchema,
  evidenceProgramNodeSchema,
  handoffProgramNodeSchema,
  operationProgramNodeSchema
]);

export const workflowProgramEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  kind: programEdgeKindSchema
});

export const nestedProcessProgramSchema = z.object({
  id: z.string().min(1),
  parent_step_id: z.string().min(1),
  title: z.string().min(1),
  entry_node_id: z.string().min(1).optional(),
  result_node_id: z.string().min(1).optional(),
  operations: z.array(operationProgramNodeSchema).min(1),
  edges: z.array(workflowProgramEdgeSchema),
  attachment_ids: z.array(z.string()).default([])
});

export const workflowProgramSchema = z.object({
  schema_version: z.literal("1.0"),
  kind: z.literal("workflow_program"),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  source_sop_id: z.string().min(1),
  entry_node_id: z.string().min(1),
  result_node_id: z.string().min(1),
  default_privacy: z.string().min(1),
  runtime_boundary: z.object({
    mode: z.literal("external_runtime"),
    stores_restricted_data: z.literal(false),
    stores_secrets: z.literal(false)
  }),
  nodes: z.array(workflowProgramNodeSchema),
  edges: z.array(workflowProgramEdgeSchema),
  nested_processes: z.array(nestedProcessProgramSchema),
  generated_outputs: z.array(z.string().min(1))
});

export type WorkflowProgram = z.infer<typeof workflowProgramSchema>;
export type WorkflowProgramNode = z.infer<typeof workflowProgramNodeSchema>;
type NestedProcessProgram = z.infer<typeof nestedProcessProgramSchema>;
type OperationProgramNode = z.infer<typeof operationProgramNodeSchema>;
type ProgramEdge = z.infer<typeof workflowProgramEdgeSchema>;
type ProgramEdgeKind = z.infer<typeof programEdgeKindSchema>;

export function compileToWorkflowProgram(input: unknown): WorkflowProgram {
  const sop = sopGraphSchema.parse(input);
  const program: WorkflowProgram = {
    schema_version: "1.0",
    kind: "workflow_program",
    id: `${sop.id}_program`,
    title: sop.title,
    ...(sop.description ? { description: sop.description } : {}),
    source_sop_id: sop.id,
    entry_node_id: sop.entry_node_id,
    result_node_id: sop.result_node_id,
    default_privacy: sop.default_privacy,
    runtime_boundary: {
      mode: "external_runtime",
      stores_restricted_data: false,
      stores_secrets: false
    },
    nodes: sop.nodes.map((node) => compileSopNode(sop, node)),
    edges: sop.edges.map(compileSopEdge),
    nested_processes: sop.subprocesses.map((subprocess) => compileNestedProcess(sop, subprocess)),
    generated_outputs: [
      ".workpath/workflow_program.json",
      ".workpath/generated/codex-handoff.md",
      ".workpath/generated/context-pack.json",
      ".workpath/generated/tool-policy.json"
    ]
  };
  return workflowProgramSchema.parse(program);
}

function compileSopNode(sop: SopGraph, node: SopNode): WorkflowProgramNode {
  if (node.kind === "step") {
    return compileStep(sop, node);
  }
  if (node.kind === "gate") {
    return compileGate(sop, node);
  }
  if (node.kind === "evidence") {
    return compileEvidence(sop, node);
  }
  return compileBoundary(sop, node);
}

function compileStep(sop: SopGraph, node: StepNode): WorkflowProgramNode {
  return {
    ...baseProgramNode(sop, node),
    kind: "process_step",
    module: node.module,
    nested_process_id: sop.subprocesses.some((subprocess) => subprocess.parent_step_id === node.id)
      ? nestedProcessId(node.id)
      : undefined,
    review_gate_ids: sop.edges.filter((edge) => edge.kind === "gates" && edge.to === node.id).map((edge) => edge.from),
    handoff_ids: sop.edges
      .filter((edge) => edge.kind === "hands_off_to" && edge.from === node.id)
      .map((edge) => edge.to)
  };
}

function compileGate(sop: SopGraph, node: GateNode): WorkflowProgramNode {
  return {
    ...baseProgramNode(sop, node),
    kind: "review_gate",
    gate_type: node.gate_kind,
    required_evidence: node.required_evidence,
    task_id: node.task_id
  };
}

function compileEvidence(sop: SopGraph, node: EvidenceNode): WorkflowProgramNode {
  return {
    ...baseProgramNode(sop, node),
    kind: "evidence_requirement",
    artifact_kind: node.artifact_kind,
    command: node.command,
    required: node.required
  };
}

function compileBoundary(sop: SopGraph, node: BoundaryNode): WorkflowProgramNode {
  return {
    ...baseProgramNode(sop, node),
    kind: "handoff_packet",
    allowed_paths: node.allowed_paths,
    denied_paths: node.denied_paths,
    evidence_required: node.evidence_required,
    objective: node.objective,
    return_contract: node.return_contract,
    task_id: node.task_id,
    to: node.to
  };
}

function compileNestedProcess(sop: SopGraph, subprocess: SopSubprocess): NestedProcessProgram {
  return {
    id: nestedProcessId(subprocess.parent_step_id),
    parent_step_id: subprocess.parent_step_id,
    title: subprocess.title,
    entry_node_id: subprocess.nodes[0]?.id,
    result_node_id: subprocess.nodes.at(-1)?.id,
    operations: subprocess.nodes.map((node) => compileOperation(sop, node)),
    edges: subprocess.edges.map(compileSubprocessEdge),
    attachment_ids: subprocess.attached_node_ids
  };
}

function compileOperation(sop: SopGraph, node: SubprocessNode): OperationProgramNode {
  return {
    ...baseProgramNode(sop, node),
    kind: "operation",
    operation_kind: "activity"
  };
}

function compileSopEdge(edge: { id: string; from: string; to: string; kind: string }): ProgramEdge {
  return {
    id: edge.id,
    from: edge.from,
    kind: programEdgeKind(edge.kind),
    to: edge.to
  };
}

function compileSubprocessEdge(edge: SubprocessEdge): ProgramEdge {
  return {
    id: edge.id,
    from: edge.from,
    kind: programEdgeKind(edge.kind),
    to: edge.to
  };
}

function programEdgeKind(kind: string): ProgramEdgeKind {
  if (kind === "gates") {
    return "guards";
  }
  return programEdgeKindSchema.parse(kind);
}

function baseProgramNode(
  sop: SopGraph,
  node: { id: string; title: string; privacy?: PrivacyClassification; notes?: string }
) {
  return {
    id: node.id,
    notes: node.notes,
    privacy: node.privacy ?? sop.default_privacy,
    title: node.title
  };
}

function nestedProcessId(stepId: string): string {
  return `${stepId}_nested_process`;
}
