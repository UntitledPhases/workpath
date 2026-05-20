import { describe, expect, it } from "vitest";

import { compileToIdeateBundle, bundleToJsonlFiles } from "../../src/domain/ideate/index.js";
import { readSeedSop } from "../helpers.js";

const OPTIONS = {
  createdAt: "2026-05-20T20:00:00.000Z",
  compilerVersion: "workpath-compiler@0.1.0"
};

describe("SOP to Ideate compiler", () => {
  it("compiles the seed SOP into the expected record counts", async () => {
    const sop = await readSeedSop();
    const bundle = compileToIdeateBundle(sop, OPTIONS);

    expect(bundle["tasks.jsonl"]).toHaveLength(6);
    expect(bundle["review_gates.jsonl"]).toHaveLength(2);
    expect(bundle["artifacts.jsonl"]).toHaveLength(2);
    expect(bundle["handoffs.jsonl"]).toHaveLength(1);
    expect(bundle["events.jsonl"]).toHaveLength(0);
    expect(bundle["returns.jsonl"]).toHaveLength(0);
  });

  it("maps produces edges into task dependencies", async () => {
    const sop = await readSeedSop();
    const bundle = compileToIdeateBundle(sop, OPTIONS);
    const execute = bundle["tasks.jsonl"].find((record) => record.id === "execute");

    expect(execute).toMatchObject({
      artifact_type: "task",
      status: "planned",
      depends_on: ["plan"],
      review_gate_ids: ["gate_reverse_pass"]
    });
  });

  it("maps validates edges into review gate evidence", async () => {
    const sop = await readSeedSop();
    const bundle = compileToIdeateBundle(sop, OPTIONS);
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
    const bundle = compileToIdeateBundle(sop, OPTIONS);
    const files = bundleToJsonlFiles(bundle);

    expect(files["tasks.jsonl"]).not.toContain("\r");
    expect(files["tasks.jsonl"]).toContain("\n");
  });

  it("keeps compiler output stable for the seed", async () => {
    const sop = await readSeedSop();
    const bundle = compileToIdeateBundle(sop, OPTIONS);

    expect(bundle).toMatchSnapshot();
  });
});

