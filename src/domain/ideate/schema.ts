import { z } from "zod";

export const privacyClassificationSchema = z.enum([
  "public",
  "internal",
  "sensitive",
  "secret",
  "forbidden"
]);

const provenanceSchema = z.record(z.string(), z.unknown());

export const ideateRecordBaseSchema = z.object({
  schema_version: z.literal("1.0"),
  artifact_type: z.string().min(1),
  id: z.string().min(1),
  created_at: z.string().min(1),
  provenance: provenanceSchema,
  privacy_classification: privacyClassificationSchema
});

export const ideateTaskSchema = ideateRecordBaseSchema.extend({
  artifact_type: z.literal("task"),
  title: z.string().min(1),
  status: z.enum(["planned", "active", "blocked", "done", "abandoned"]),
  module: z.string().optional(),
  depends_on: z.array(z.string()).default([]),
  review_gate_ids: z.array(z.string()).default([])
});

export const ideateArtifactSchema = ideateRecordBaseSchema.extend({
  artifact_type: z.literal("artifact"),
  artifact_kind: z.string().min(1),
  required: z.boolean().optional(),
  status: z.enum(["passed", "failed", "skipped", "waived"]).optional(),
  command: z.string().optional()
});

export const ideateReviewGateSchema = ideateRecordBaseSchema.extend({
  artifact_type: z.literal("review_gate"),
  task_id: z.string().min(1),
  gate_type: z.string().min(1),
  status: z.enum(["pending", "passed", "failed", "waived"]),
  required_evidence: z.array(z.string().min(1)).default([]),
  evidence: z.array(z.string().min(1)).default([])
});

export const ideateHandoffSchema = ideateRecordBaseSchema.extend({
  artifact_type: z.literal("handoff"),
  task_id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  objective: z.string().min(1),
  allowed_paths: z.array(z.string().min(1)).min(1),
  denied_paths: z.array(z.string().min(1)).default([]),
  return_contract: z.record(z.string(), z.unknown()),
  evidence_required: z.array(z.string().min(1)).min(1)
});

export const ideatePrivacyBoundarySchema = ideateRecordBaseSchema.extend({
  artifact_type: z.literal("privacy_boundary"),
  scope: z.string().min(1),
  policy: z.string().min(1)
});

export const ideateEventSchema = ideateRecordBaseSchema.extend({
  artifact_type: z.literal("event"),
  event_type: z.string().min(1),
  task_id: z.string().min(1).optional(),
  sequence: z.number().int().nonnegative().optional()
});

export const ideateReturnResumeSchema = ideateRecordBaseSchema.extend({
  artifact_type: z.literal("return_resume"),
  task_id: z.string().min(1),
  handoff_id: z.string().min(1).optional(),
  last_seen_event_id: z.string().min(1).optional(),
  next_safe_action: z.string().min(1)
});

export const ideateOwnershipClaimSchema = ideateRecordBaseSchema.extend({
  artifact_type: z.literal("ownership_claim"),
  task_id: z.string().min(1).optional(),
  owner: z.string().min(1),
  paths: z.array(z.string().min(1)).min(1),
  coordination_id: z.string().optional()
});

export const ideateMemoryCandidateSchema = ideateRecordBaseSchema.extend({
  artifact_type: z.literal("memory_candidate"),
  summary: z.string().min(1),
  evidence: z.array(z.string().min(1)).default([])
});

export const ideateRecordSchema = z.discriminatedUnion("artifact_type", [
  ideateTaskSchema,
  ideateArtifactSchema,
  ideateReviewGateSchema,
  ideateHandoffSchema,
  ideatePrivacyBoundarySchema,
  ideateEventSchema,
  ideateReturnResumeSchema,
  ideateOwnershipClaimSchema,
  ideateMemoryCandidateSchema
]);

export type IdeateTask = z.infer<typeof ideateTaskSchema>;
export type IdeateArtifact = z.infer<typeof ideateArtifactSchema>;
export type IdeateReviewGate = z.infer<typeof ideateReviewGateSchema>;
export type IdeateHandoff = z.infer<typeof ideateHandoffSchema>;
export type IdeatePrivacyBoundary = z.infer<typeof ideatePrivacyBoundarySchema>;
export type IdeateRecord = z.infer<typeof ideateRecordSchema>;
