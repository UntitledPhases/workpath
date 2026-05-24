import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  compileToAuditJsonlBundle,
  bundleToJsonlFiles,
  writeAuditJsonlBundle
} from "../../src/adapters/audit-jsonl/index.js";
import { writeWorkpathExport } from "../../src/domain/workpath/emitter.js";
import { readSeedSop } from "../helpers.js";

const OPTIONS = {
  createdAt: "2026-05-20T20:00:00.000Z",
  compilerVersion: "workpath-compiler@0.1.0",
  exportMode: "specification" as const
};

describe("SOP to audit JSONL compiler", () => {
  it("compiles the seed SOP into the expected record counts", async () => {
    const sop = await readSeedSop();
    const bundle = compileToAuditJsonlBundle(sop, OPTIONS);

    expect(bundle["tasks.jsonl"]).toHaveLength(6);
    expect(bundle["review_gates.jsonl"]).toHaveLength(2);
    expect(bundle["artifacts.jsonl"]).toHaveLength(2);
    expect(bundle["handoffs.jsonl"]).toHaveLength(1);
    expect(bundle["events.jsonl"]).toHaveLength(0);
    expect(bundle["returns.jsonl"]).toHaveLength(0);
  });

  it("maps produces edges into task dependencies", async () => {
    const sop = await readSeedSop();
    const bundle = compileToAuditJsonlBundle(sop, OPTIONS);
    const execute = bundle["tasks.jsonl"].find((record) => record.id === "execute");

    expect(execute).toMatchObject({
      artifact_type: "task",
      status: "planned",
      depends_on: ["plan"],
      review_gate_ids: ["gate_reverse_pass"]
    });
  });

  it("marks every audit JSONL record as a Workpath specification export", async () => {
    const sop = await readSeedSop();
    const bundle = compileToAuditJsonlBundle(sop, OPTIONS);

    for (const records of Object.values(bundle)) {
      for (const record of records) {
        expect(record).toMatchObject({
          workpath_export_mode: "specification"
        });
      }
    }
  });

  it("maps validates edges into review gate evidence", async () => {
    const sop = await readSeedSop();
    const bundle = compileToAuditJsonlBundle(sop, OPTIONS);
    const tests = bundle["review_gates.jsonl"].find((record) => record.id === "gate_tests");

    expect(tests).toMatchObject({
      artifact_type: "review_gate",
      task_id: "verify",
      gate_type: "tests",
      status: "passed",
      evidence: ["artifact_tests_passed"]
    });
  });

  it("emits LF-only JSONL", async () => {
    const sop = await readSeedSop();
    const bundle = compileToAuditJsonlBundle(sop, OPTIONS);
    const files = bundleToJsonlFiles(bundle);

    expect(files["tasks.jsonl"]).not.toContain("\r");
    expect(files["tasks.jsonl"]).toContain("\n");
  });

  it("keeps compiler output stable for the seed", async () => {
    const sop = await readSeedSop();
    const bundle = compileToAuditJsonlBundle(sop, OPTIONS);

    expect(bundle).toMatchSnapshot();
  });

  it("writes audit JSONL files", async () => {
    const sop = await readSeedSop();
    const bundle = compileToAuditJsonlBundle(sop, OPTIONS);
    const outDir = await mkdtemp(join(tmpdir(), "workpath-emitter-"));

    try {
      await writeAuditJsonlBundle(bundle, outDir);
      const tasks = await readFile(join(outDir, "tasks.jsonl"), "utf8");

      expect(tasks).toContain('"artifact_type":"task"');
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("writes Workpath control artifacts beside audit JSONL files", async () => {
    const sop = await readSeedSop();
    const outDir = await mkdtemp(join(tmpdir(), "workpath-export-"));

    try {
      await writeWorkpathExport(sop, outDir, OPTIONS);
      const manifest = JSON.parse(await readFile(join(outDir, "workpath.json"), "utf8")) as {
        entry_file: string;
        export_mode: string;
        read_order: string[];
        sop_id: string;
      };
      const program = JSON.parse(await readFile(join(outDir, ".workpath", "workflow_program.json"), "utf8")) as {
        kind: string;
        source_sop_id: string;
      };
      const instructions = await readFile(join(outDir, ".workpath", "generated", "operator-instructions.md"), "utf8");
      const hookJson = JSON.parse(await readFile(join(outDir, ".workpath", "generated", "workflow-hook.json"), "utf8")) as {
        kind: string;
        profile: {
          trigger: {
            task_types: string[];
          };
        };
      };
      const hookMarkdown = await readFile(join(outDir, ".workpath", "generated", "workflow-hook.md"), "utf8");
      const toolPolicy = await readFile(join(outDir, ".workpath", "generated", "tool-policy.json"), "utf8");
      const contextPack = await readFile(join(outDir, ".workpath", "generated", "context-pack.json"), "utf8");

      expect(manifest).toMatchObject({
        entry_file: ".workpath/workflow_program.json",
        export_mode: "specification",
        sop_id: "sop_project_loop"
      });
      expect(manifest.read_order).toContain(".workpath/generated/operator-instructions.md");
      expect(manifest.read_order).toContain(".workpath/generated/workflow-hook.json");
      expect(program).toMatchObject({
        kind: "workflow_program",
        source_sop_id: "sop_project_loop"
      });
      expect(hookJson).toMatchObject({
        kind: "workpath_workflow_hook",
        profile: {
          trigger: {
            task_types: ["ambiguous_project", "research_heavy_decision", "multi_phase_build", "workflow_design"]
          }
        }
      });
      expect(hookMarkdown).toContain("Use This Workflow When");
      expect(instructions).toContain("Run 40 independent cheap worker pass(es).");
      expect(toolPolicy).toContain('"workpath_tool_policy"');
      expect(contextPack).toContain('"workpath_context_pack"');
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});
