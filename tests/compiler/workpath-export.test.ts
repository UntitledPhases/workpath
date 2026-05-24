import { describe, expect, it } from "vitest";

import { buildWorkpathExportFiles, buildZip } from "../../src/domain/workpath/index.js";
import { readSeedSop } from "../helpers.js";

describe("Workpath browser export", () => {
  it("builds audit JSONL files plus Workpath source files from a draft SOP", async () => {
    const seed = await readSeedSop();
    const files = buildWorkpathExportFiles(seed, { createdAt: "2026-05-20T20:00:00.000Z" });

    expect(Object.keys(files).sort()).toEqual([
      ".workpath/generated/context-pack.json",
      ".workpath/generated/operator-instructions.md",
      ".workpath/generated/tool-policy.json",
      ".workpath/generated/workflow-hook.json",
      ".workpath/generated/workflow-hook.md",
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
    const manifest = JSON.parse(files["workpath.json"]) as {
      entry_file: string;
      export_mode: string;
      read_order: string[];
    };
    const program = JSON.parse(files[".workpath/workflow_program.json"]) as {
      generated_outputs: string[];
      kind: string;
      profile: {
        goal: string;
        return_contract: {
          required_sections: string[];
        };
      };
    };
    const hook = JSON.parse(files[".workpath/generated/workflow-hook.json"]) as {
      kind: string;
      profile: {
        trigger: {
          activation_rules: string[];
        };
        return_contract: {
          required_sections: string[];
        };
      };
      workflow_program: string;
    };

    expect(manifest).toMatchObject({
      export_mode: "specification",
      entry_file: ".workpath/workflow_program.json"
    });
    expect(program.kind).toBe("workflow_program");
    expect(program.profile.goal).toContain("Turn vague or multi-phase user intent");
    expect(files[".workpath/workflow_program.json"]).toContain('"worker_count": 40');
    expect(hook).toMatchObject({
      kind: "workpath_workflow_hook",
      workflow_program: ".workpath/workflow_program.json",
      profile: {
        return_contract: {
          required_sections: ["summary", "files_changed", "verification", "risks", "next_slice"]
        }
      }
    });
    expect(hook.profile.trigger.activation_rules[0]).toContain("planning, implementation, repo work");
    expect(files[".workpath/generated/workflow-hook.md"]).toContain("Use This Workflow When");
    expect(files[".workpath/generated/workflow-hook.md"]).toContain("Return These Sections");
    for (const generatedFile of program.generated_outputs) {
      expect(files[generatedFile], generatedFile).toBeDefined();
    }
    for (const fileName of manifest.read_order) {
      expect(files[fileName], fileName).toBeDefined();
    }
    expect(files[".workpath/generated/operator-instructions.md"]).toContain(
      "Run 40 independent cheap worker pass(es)."
    );
    expect(files[".workpath/generated/operator-instructions.md"]).toContain("## Activation");
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
