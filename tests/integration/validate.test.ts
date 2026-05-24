import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("audit JSONL compatibility integration", () => {
  it("validates the committed exported example with agentic-sdlc", () => {
    let output = "";
    try {
      output = execFileSync("agentic-sdlc", ["validate", "examples/exported-project-sop"], {
        encoding: "utf8"
      });
    } catch (error) {
      const maybe = error as { code?: string; message?: string; stdout?: string };
      if (maybe.code === "ENOENT" || maybe.message?.includes("ENOENT")) {
        console.warn("Skipping: agentic-sdlc is not available on PATH.");
        return;
      }
      throw error;
    }

    expect(output).toContain("PASS");
  });
});
