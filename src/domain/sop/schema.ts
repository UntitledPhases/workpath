import { z } from "zod";

export const SOP_NODE_TITLE_MAX_LENGTH = 24;

export const privacyClassificationSchema = z.enum([
  "public",
  "internal",
  "sensitive",
  "secret",
  "forbidden"
]);

export const stepModuleSchema = z.enum([
  "intent",
  "research",
  "plan",
  "execute",
  "verify",
  "return"
]);

export const gateKindSchema = z.enum([
  "reverse_pass",
  "approval",
  "tests",
  "privacy"
]);

export const edgeKindSchema = z.enum([
  "produces",
  "validates",
  "gates",
  "hands_off_to"
]);

export const subprocessEdgeKindSchema = z.enum([
  "sequence",
  "produces",
  "validates",
  "delegates_to",
  "gates"
]);

export const modelTierSchema = z.enum([
  "cheap",
  "medium",
  "expensive",
  "local",
  "custom"
]);

export const reasoningLevelSchema = z.enum([
  "none",
  "low",
  "medium",
  "high"
]);

const workerProfileSchema = z.object({
  model_tier: modelTierSchema,
  reasoning: reasoningLevelSchema.optional(),
  role: z.string().min(1)
});

const operationExecutionSchema = z.object({
  mode: z.enum(["parallel", "sequential"]),
  max_concurrency: z.number().int().positive().optional(),
  fallback: z.string().min(1).optional()
});

const operationInputContractSchema = z.object({
  requires: z.array(z.string().min(1)).default([])
});

const operationOutputContractSchema = z.object({
  artifact_kind: z.string().min(1),
  required_fields: z.array(z.string().min(1)).min(1)
});

const operationEscalationSchema = z.object({
  when: z.array(z.string().min(1)).min(1),
  target: z.string().min(1).optional()
});

export const operationActionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("activity"),
    instructions: z.string().min(1).optional()
  }),
  z.object({
    kind: z.literal("agent_fanout"),
    worker_count: z.number().int().positive().max(200),
    worker_profile: workerProfileSchema,
    execution: operationExecutionSchema,
    input_contract: operationInputContractSchema,
    output_contract: operationOutputContractSchema,
    merge_strategy: z.object({
      kind: z.literal("cluster_rank_synthesize"),
      target_operation_id: z.string().min(1)
    }),
    budget_per_run: z
      .object({
        token_budget: z.number().int().positive().optional(),
        max_minutes: z.number().int().positive().optional()
      })
      .optional(),
    escalation: operationEscalationSchema.optional()
  }),
  z.object({
    kind: z.literal("synthesis"),
    strategy: z.literal("cluster_rank_synthesize"),
    inputs: z.array(z.string().min(1)).min(1),
    output_contract: operationOutputContractSchema,
    escalation: operationEscalationSchema.optional()
  })
]);

const nodeBaseSchema = z.object({
  id: z.string().min(1).regex(/^[A-Za-z][A-Za-z0-9_-]*$/),
  title: z.string().min(1).max(SOP_NODE_TITLE_MAX_LENGTH),
  privacy: privacyClassificationSchema.optional(),
  notes: z.string().optional()
});

export const stepNodeSchema = nodeBaseSchema.extend({
  kind: z.literal("step"),
  module: stepModuleSchema
});

export const gateNodeSchema = nodeBaseSchema.extend({
  kind: z.literal("gate"),
  gate_kind: gateKindSchema,
  task_id: z.string().min(1),
  required_evidence: z.array(z.string().min(1)).min(1)
});

export const evidenceNodeSchema = nodeBaseSchema.extend({
  kind: z.literal("evidence"),
  artifact_kind: z.string().min(1),
  required: z.boolean().default(true),
  command: z.string().min(1).optional()
});

export const boundaryNodeSchema = nodeBaseSchema.extend({
  kind: z.literal("boundary"),
  task_id: z.string().min(1),
  to: z.string().min(1),
  objective: z.string().min(1),
  allowed_paths: z.array(z.string().min(1)).min(1),
  denied_paths: z.array(z.string().min(1)).default([]),
  return_contract: z.object({
    required_fields: z.array(z.string().min(1)).min(1)
  }),
  evidence_required: z.array(z.string().min(1)).min(1)
});

export const sopNodeSchema = z.discriminatedUnion("kind", [
  stepNodeSchema,
  gateNodeSchema,
  evidenceNodeSchema,
  boundaryNodeSchema
]);

export const sopEdgeSchema = z.object({
  id: z.string().min(1).regex(/^[A-Za-z][A-Za-z0-9_-]*$/),
  from: z.string().min(1),
  to: z.string().min(1),
  kind: edgeKindSchema
});

export const canvasNodeSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number()
});

export const subprocessNodeSchema = nodeBaseSchema.extend({
  kind: z.literal("activity"),
  action: operationActionSchema.optional()
});

export const subprocessEdgeSchema = z.object({
  id: z.string().min(1).regex(/^[A-Za-z][A-Za-z0-9_-]*$/),
  from: z.string().min(1),
  to: z.string().min(1),
  kind: subprocessEdgeKindSchema
});

export const subprocessSchema = z.object({
  parent_step_id: z.string().min(1),
  title: z.string().min(1),
  nodes: z.array(subprocessNodeSchema).min(1),
  edges: z.array(subprocessEdgeSchema),
  attached_node_ids: z.array(z.string().min(1)).default([]),
  canvas: z.object({
    nodes: z.array(canvasNodeSchema)
  })
});

export const sopGraphSchema = z
  .object({
    schema_version: z.literal("1.0"),
    kind: z.literal("single_node_sop"),
    id: z.string().min(1).regex(/^[A-Za-z][A-Za-z0-9_-]*$/),
    title: z.string().min(1),
    description: z.string().optional(),
    entry_node_id: z.string().min(1),
    result_node_id: z.string().min(1),
    default_privacy: privacyClassificationSchema.default("internal"),
    nodes: z.array(sopNodeSchema).min(1),
    edges: z.array(sopEdgeSchema),
    subprocesses: z.array(subprocessSchema).default([]),
    canvas: z.object({
      viewport: z.object({
        x: z.number(),
        y: z.number(),
        zoom: z.number().positive()
      }),
      nodes: z.array(canvasNodeSchema)
    })
  })
  .superRefine((graph, ctx) => {
    const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
    const stepIds = new Set(graph.nodes.filter((node) => node.kind === "step").map((node) => node.id));

    if (!nodes.has(graph.entry_node_id)) {
      ctx.addIssue({
        code: "custom",
        path: ["entry_node_id"],
        message: "entry_node_id must reference an existing node"
      });
    }
    if (!nodes.has(graph.result_node_id)) {
      ctx.addIssue({
        code: "custom",
        path: ["result_node_id"],
        message: "result_node_id must reference an existing node"
      });
    }

    const seenNodeIds = new Set<string>();
    for (const [index, node] of graph.nodes.entries()) {
      if (seenNodeIds.has(node.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes", index, "id"],
          message: "node ids must be unique"
        });
      }
      seenNodeIds.add(node.id);
      if ((node.kind === "gate" || node.kind === "boundary") && !nodes.has(node.task_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes", index, "task_id"],
          message: `${node.kind} task_id must reference an existing step node`
        });
      }
      if ((node.kind === "gate" || node.kind === "boundary") && nodes.get(node.task_id)?.kind !== "step") {
        ctx.addIssue({
          code: "custom",
          path: ["nodes", index, "task_id"],
          message: `${node.kind} task_id must reference a step node`
        });
      }
    }

    const seenEdgeIds = new Set<string>();
    for (const [index, edge] of graph.edges.entries()) {
      if (seenEdgeIds.has(edge.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index, "id"],
          message: "edge ids must be unique"
        });
      }
      seenEdgeIds.add(edge.id);
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index],
          message: "edge endpoints must reference existing nodes"
        });
        continue;
      }
      const allowed =
        (edge.kind === "produces" && from.kind === "step" && to.kind === "step") ||
        (edge.kind === "validates" && from.kind === "evidence" && to.kind === "gate") ||
        (edge.kind === "gates" && from.kind === "gate" && to.kind === "step") ||
        (edge.kind === "hands_off_to" && from.kind === "step" && to.kind === "boundary");
      if (!allowed) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index, "kind"],
          message: `invalid ${edge.kind} edge from ${from.kind} to ${to.kind}`
        });
      }
    }

    const seenSubprocessParents = new Set<string>();
    const globalSubprocessNodeIds = new Set<string>();
    for (const [subprocessIndex, subprocess] of graph.subprocesses.entries()) {
      if (seenSubprocessParents.has(subprocess.parent_step_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["subprocesses", subprocessIndex, "parent_step_id"],
          message: "only one subprocess may describe a step"
        });
      }
      seenSubprocessParents.add(subprocess.parent_step_id);

      if (!stepIds.has(subprocess.parent_step_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["subprocesses", subprocessIndex, "parent_step_id"],
          message: "subprocess parent_step_id must reference a step node"
        });
      }

      const subprocessNodes = new Set<string>();
      for (const [nodeIndex, node] of subprocess.nodes.entries()) {
        if (nodes.has(node.id) || globalSubprocessNodeIds.has(node.id)) {
          ctx.addIssue({
            code: "custom",
            path: ["subprocesses", subprocessIndex, "nodes", nodeIndex, "id"],
            message: "subprocess node ids must be globally unique"
          });
        }
        if (subprocessNodes.has(node.id)) {
          ctx.addIssue({
            code: "custom",
            path: ["subprocesses", subprocessIndex, "nodes", nodeIndex, "id"],
            message: "subprocess node ids must be unique within the subprocess"
          });
        }
        subprocessNodes.add(node.id);
        globalSubprocessNodeIds.add(node.id);
      }

      for (const [nodeIndex, node] of subprocess.nodes.entries()) {
        if (node.action?.kind === "agent_fanout") {
          if (!subprocessNodes.has(node.action.merge_strategy.target_operation_id)) {
            ctx.addIssue({
              code: "custom",
              path: ["subprocesses", subprocessIndex, "nodes", nodeIndex, "action", "merge_strategy", "target_operation_id"],
              message: "agent_fanout merge_strategy.target_operation_id must reference an operation in the subprocess"
            });
          }
          if (
            node.action.execution.max_concurrency &&
            node.action.execution.max_concurrency > node.action.worker_count
          ) {
            ctx.addIssue({
              code: "custom",
              path: ["subprocesses", subprocessIndex, "nodes", nodeIndex, "action", "execution", "max_concurrency"],
              message: "agent_fanout max_concurrency cannot exceed worker_count"
            });
          }
          if (node.action.escalation?.target && !subprocessNodes.has(node.action.escalation.target)) {
            ctx.addIssue({
              code: "custom",
              path: ["subprocesses", subprocessIndex, "nodes", nodeIndex, "action", "escalation", "target"],
              message: "agent_fanout escalation target must reference an operation in the subprocess"
            });
          }
        }
        if (node.action?.kind === "synthesis") {
          for (const [inputIndex, inputId] of node.action.inputs.entries()) {
            if (!subprocessNodes.has(inputId)) {
              ctx.addIssue({
                code: "custom",
                path: ["subprocesses", subprocessIndex, "nodes", nodeIndex, "action", "inputs", inputIndex],
                message: "synthesis inputs must reference operations in the subprocess"
              });
            }
          }
          if (node.action.escalation?.target && !subprocessNodes.has(node.action.escalation.target)) {
            ctx.addIssue({
              code: "custom",
              path: ["subprocesses", subprocessIndex, "nodes", nodeIndex, "action", "escalation", "target"],
              message: "synthesis escalation target must reference an operation in the subprocess"
            });
          }
        }
      }

      const seenSubprocessEdgeIds = new Set<string>();
      const endpointIds = new Set([...subprocessNodes, ...subprocess.attached_node_ids]);
      for (const [edgeIndex, edge] of subprocess.edges.entries()) {
        if (seenSubprocessEdgeIds.has(edge.id)) {
          ctx.addIssue({
            code: "custom",
            path: ["subprocesses", subprocessIndex, "edges", edgeIndex, "id"],
            message: "subprocess edge ids must be unique within the subprocess"
          });
        }
        seenSubprocessEdgeIds.add(edge.id);
        if (!endpointIds.has(edge.from) || !endpointIds.has(edge.to)) {
          ctx.addIssue({
            code: "custom",
            path: ["subprocesses", subprocessIndex, "edges", edgeIndex],
            message: "subprocess edge endpoints must reference subprocess nodes or attached SOP nodes"
          });
        }
      }

      for (const [attachedIndex, attachedNodeId] of subprocess.attached_node_ids.entries()) {
        if (!nodes.has(attachedNodeId)) {
          ctx.addIssue({
            code: "custom",
            path: ["subprocesses", subprocessIndex, "attached_node_ids", attachedIndex],
            message: "attached_node_ids must reference existing SOP nodes"
          });
        }
      }

      for (const [canvasIndex, canvasNode] of subprocess.canvas.nodes.entries()) {
        if (!endpointIds.has(canvasNode.id)) {
          ctx.addIssue({
            code: "custom",
            path: ["subprocesses", subprocessIndex, "canvas", "nodes", canvasIndex, "id"],
            message: "subprocess canvas nodes must reference subprocess nodes or attached SOP nodes"
          });
        }
      }
    }
  });

export type PrivacyClassification = z.infer<typeof privacyClassificationSchema>;
export type StepModule = z.infer<typeof stepModuleSchema>;
export type GateKind = z.infer<typeof gateKindSchema>;
export type EdgeKind = z.infer<typeof edgeKindSchema>;
export type SubprocessEdgeKind = z.infer<typeof subprocessEdgeKindSchema>;
export type ModelTier = z.infer<typeof modelTierSchema>;
export type ReasoningLevel = z.infer<typeof reasoningLevelSchema>;
export type OperationAction = z.infer<typeof operationActionSchema>;
export type SopNode = z.infer<typeof sopNodeSchema>;
export type StepNode = z.infer<typeof stepNodeSchema>;
export type GateNode = z.infer<typeof gateNodeSchema>;
export type EvidenceNode = z.infer<typeof evidenceNodeSchema>;
export type BoundaryNode = z.infer<typeof boundaryNodeSchema>;
export type SopEdge = z.infer<typeof sopEdgeSchema>;
export type CanvasNode = z.infer<typeof canvasNodeSchema>;
export type SubprocessNode = z.infer<typeof subprocessNodeSchema>;
export type SubprocessEdge = z.infer<typeof subprocessEdgeSchema>;
export type SopSubprocess = z.infer<typeof subprocessSchema>;
export type SopGraph = z.infer<typeof sopGraphSchema>;
