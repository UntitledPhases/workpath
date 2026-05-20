import { z } from "zod";

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

const nodeBaseSchema = z.object({
  id: z.string().min(1).regex(/^[A-Za-z][A-Za-z0-9_-]*$/),
  title: z.string().min(1),
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
  });

export type PrivacyClassification = z.infer<typeof privacyClassificationSchema>;
export type StepModule = z.infer<typeof stepModuleSchema>;
export type GateKind = z.infer<typeof gateKindSchema>;
export type EdgeKind = z.infer<typeof edgeKindSchema>;
export type SopNode = z.infer<typeof sopNodeSchema>;
export type StepNode = z.infer<typeof stepNodeSchema>;
export type GateNode = z.infer<typeof gateNodeSchema>;
export type EvidenceNode = z.infer<typeof evidenceNodeSchema>;
export type BoundaryNode = z.infer<typeof boundaryNodeSchema>;
export type SopEdge = z.infer<typeof sopEdgeSchema>;
export type SopGraph = z.infer<typeof sopGraphSchema>;

