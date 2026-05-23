import { describe, expect, it } from "vitest";

import { buildWorkpathExportFiles, buildZip } from "../../src/domain/workpath/index.js";
import { readSeedSop } from "../helpers.js";

describe("Workpath browser export", () => {
  it("builds the Ideate bundle plus source files from a draft SOP", async () => {
    const seed = await readSeedSop();
    const files = buildWorkpathExportFiles(seed, { createdAt: "2026-05-20T20:00:00.000Z" });

    expect(Object.keys(files).sort()).toEqual([
      ".workpath/generated/context-pack.json",
      ".workpath/generated/operator-instructions.md",
      ".workpath/generated/tool-policy.json",
      ".workpath/workflow_program.json",
      "artifacts.jsonl",
      "canvas.json",
      "events.jsonl",
      "handoffs.jsonl",
      "memory_candidates.jsonl",
      "ownership_claims.jsonl",
      "privacy_boundaries.jsonl",
      "returns.jsonl",
      "review_gates.jsonl",
      "sop.json",
      "tasks.jsonl",
      "workpath.json"
    ]);
    expect(files["tasks.jsonl"]).toContain('"artifact_type":"task"');
    expect(files["sop.json"]).toContain('"title": "Project SOP"');
    expect(files["workpath.json"]).toContain('"export_mode": "specification"');
    expect(files["workpath.json"]).toContain('"entry_file": ".workpath/workflow_program.json"');
    expect(files[".workpath/workflow_program.json"]).toContain('"kind": "workflow_program"');
    expect(files[".workpath/workflow_program.json"]).toContain('"worker_count": 40');
    expect(files[".workpath/generated/operator-instructions.md"]).toContain(
      "Run 40 independent cheap worker pass(es)."
    );
    expect(files[".workpath/generated/context-pack.json"]).toContain('"kind": "workpath_context_pack"');
    expect(files[".workpath/generated/tool-policy.json"]).toContain('"kind": "workpath_tool_policy"');
  });

  it("creates a valid uncompressed zip payload", async () => {
    const seed = await readSeedSop();
    const zip = buildZip(buildWorkpathExportFiles(seed, { createdAt: "2026-05-20T20:00:00.000Z" }));

    expect(zip.byteLength).toBeGreaterThan(1000);
    expect(Array.from(zip.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(new TextDecoder().decode(zip)).toContain("tasks.jsonl");
  });
});
