import { IDEATE_FILES } from "../ideate/compiler.js";
import { type SopGraph } from "../sop/index.js";
import { type WorkflowProgram } from "./program.js";

export const WORKPATH_PROGRAM_FILE = ".workpath/workflow_program.json";
export const WORKPATH_GENERATED_PACKET_FILES = [
  ".workpath/generated/operator-instructions.md",
  ".workpath/generated/context-pack.json",
  ".workpath/generated/tool-policy.json"
] as const;

export const WORKPATH_SOURCE_FILES = ["sop.json", "canvas.json", "workpath.json"] as const;

export function workpathReadOrder(): string[] {
  return [
    "workpath.json",
    WORKPATH_PROGRAM_FILE,
    ...WORKPATH_GENERATED_PACKET_FILES,
    "tasks.jsonl",
    "handoffs.jsonl",
    "review_gates.jsonl",
    "artifacts.jsonl",
    "privacy_boundaries.jsonl",
    "events.jsonl",
    "returns.jsonl",
    "ownership_claims.jsonl",
    "memory_candidates.jsonl",
    "sop.json",
    "canvas.json"
  ];
}

export function buildWorkpathManifest(source: SopGraph, compilerVersion: string) {
  return {
    schema_version: "1.0",
    kind: "workpath_export_manifest",
    sop_id: source.id,
    export_mode: "specification",
    compiler: compilerVersion,
    entry_file: WORKPATH_PROGRAM_FILE,
    entry_node_id: source.entry_node_id,
    read_order: workpathReadOrder()
  };
}

export function buildGeneratedPacketFiles(program: WorkflowProgram): Record<string, string> {
  return {
    ".workpath/generated/operator-instructions.md": buildOperatorInstructions(program),
    ".workpath/generated/context-pack.json": `${JSON.stringify(buildContextPack(program), null, 2)}\n`,
    ".workpath/generated/tool-policy.json": `${JSON.stringify(buildToolPolicy(program), null, 2)}\n`
  };
}

function buildOperatorInstructions(program: WorkflowProgram): string {
  const topLevel = program.edges
    .filter((edge) => edge.kind === "produces")
    .map((edge) => `${edge.from} -> ${edge.to}`);
  const operations = program.nested_processes.flatMap((process) =>
    process.operations.map((operation) => ({ operation, process }))
  );
  const fanouts = operations.filter(({ operation }) => operation.action.kind === "agent_fanout");
  const syntheses = operations.filter(({ operation }) => operation.action.kind === "synthesis");

  const lines = [
    `# ${program.title} Agent Packet`,
    "",
    "Use this packet as the operating contract for a single AI work node.",
    `Entry file: ${WORKPATH_PROGRAM_FILE}`,
    `Entry node: ${program.entry_node_id}`,
    `Result node: ${program.result_node_id}`,
    "",
    "## Read Order",
    "",
    ...workpathReadOrder().map((fileName, index) => `${index + 1}. ${fileName}`),
    "",
    "## Top-Level Flow",
    "",
    ...topLevel.map((edge) => `- ${edge}`),
    ""
  ];

  if (fanouts.length) {
    lines.push("## Fanout Operations", "");
    for (const { operation, process } of fanouts) {
      if (operation.action.kind !== "agent_fanout") {
        continue;
      }
      lines.push(
        `### ${operation.title}`,
        "",
        `- Process: ${process.parent_step_id}`,
        `- Operation ID: ${operation.id}`,
        `- Run ${operation.action.worker_count} independent ${operation.action.worker_profile.model_tier} worker pass(es).`,
        `- Worker role: ${operation.action.worker_profile.role}`,
        `- Reasoning: ${operation.action.worker_profile.reasoning ?? "unspecified"}`,
        `- Execution mode: ${operation.action.execution.mode}`,
        `- Max concurrency: ${operation.action.execution.max_concurrency ?? "unspecified"}`,
        `- Fallback: ${operation.action.execution.fallback ?? "none"}`,
        `- Required input context: ${formatList(operation.action.input_contract.requires)}`,
        `- Each worker returns ${operation.action.output_contract.artifact_kind} with fields: ${formatList(
          operation.action.output_contract.required_fields
        )}.`,
        `- Merge strategy: ${operation.action.merge_strategy.kind}`,
        `- Merge target operation: ${operation.action.merge_strategy.target_operation_id}`,
        operation.action.escalation
          ? `- Escalate when: ${formatList(operation.action.escalation.when)}${
              operation.action.escalation.target ? `; target: ${operation.action.escalation.target}` : ""
            }`
          : "- Escalation: none",
        ""
      );
    }
  }

  if (syntheses.length) {
    lines.push("## Synthesis Operations", "");
    for (const { operation, process } of syntheses) {
      if (operation.action.kind !== "synthesis") {
        continue;
      }
      lines.push(
        `### ${operation.title}`,
        "",
        `- Process: ${process.parent_step_id}`,
        `- Operation ID: ${operation.id}`,
        `- Strategy: ${operation.action.strategy}`,
        `- Inputs: ${formatList(operation.action.inputs)}`,
        `- Output artifact: ${operation.action.output_contract.artifact_kind}`,
        `- Required fields: ${formatList(operation.action.output_contract.required_fields)}`,
        operation.action.escalation
          ? `- Escalate when: ${formatList(operation.action.escalation.when)}${
              operation.action.escalation.target ? `; target: ${operation.action.escalation.target}` : ""
            }`
          : "- Escalation: none",
        ""
      );
    }
  }

  lines.push(
    "## Evidence Discipline",
    "",
    "- Treat review gates as stop points.",
    "- Produce the required evidence before claiming a gate has passed.",
    "- Do not persist secrets, credentials, raw transcripts, or bulky logs in packet files.",
    ""
  );

  return `${lines.join("\n").trimEnd()}\n`;
}

function buildContextPack(program: WorkflowProgram) {
  return {
    schema_version: "1.0",
    kind: "workpath_context_pack",
    sop_id: program.source_sop_id,
    entry_node_id: program.entry_node_id,
    default_privacy: program.default_privacy,
    static_context: [
      {
        id: "workflow_program",
        path: WORKPATH_PROGRAM_FILE,
        purpose: "Canonical machine-readable workflow contract."
      },
      {
        id: "source_sop",
        path: "sop.json",
        purpose: "Reimportable authoring source."
      },
      {
        id: "audit_bundle",
        paths: IDEATE_FILES,
        purpose: "Evidence, handoff, task, and runtime JSONL records."
      }
    ],
    operation_inputs: program.nested_processes.flatMap((process) =>
      process.operations
        .filter((operation) => operation.action.kind === "agent_fanout")
        .map((operation) => ({
          operation_id: operation.id,
          process_id: process.id,
          requires:
            operation.action.kind === "agent_fanout" ? operation.action.input_contract.requires : []
        }))
    )
  };
}

function buildToolPolicy(program: WorkflowProgram) {
  const handoffs = program.nodes.filter((node) => node.kind === "handoff_packet");
  return {
    schema_version: "1.0",
    kind: "workpath_tool_policy",
    sop_id: program.source_sop_id,
    runtime_boundary: program.runtime_boundary,
    default_policy: {
      secrets: "do_not_read_or_persist",
      filesystem: "bounded_by_allowed_paths",
      network: "allowed_only_when_required_by_operation",
      human_approval: "required_for_external_side_effects"
    },
    path_policy: {
      allowed_paths: unique(handoffs.flatMap((handoff) => (handoff.kind === "handoff_packet" ? handoff.allowed_paths : []))),
      denied_paths: unique(handoffs.flatMap((handoff) => (handoff.kind === "handoff_packet" ? handoff.denied_paths : [])))
    },
    operation_policies: program.nested_processes.flatMap((process) =>
      process.operations
        .filter((operation) => operation.action.kind === "agent_fanout")
        .map((operation) => ({
          operation_id: operation.id,
          process_id: process.id,
          allowed_tools: ["web_search", "local_context_read"],
          denied_capabilities: ["credential_access", "secret_exfiltration", "unbounded_filesystem_write"],
          execution: operation.action.kind === "agent_fanout" ? operation.action.execution : undefined
        }))
    )
  };
}

function formatList(items: string[]): string {
  return items.length ? items.join(", ") : "none";
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}
