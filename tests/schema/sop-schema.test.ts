import { describe, expect, it } from "vitest";

import { sopGraphSchema } from "../../src/domain/sop/index.js";
import { readSeedSop } from "../helpers.js";

describe("native SOP schema", () => {
  it("parses the committed seed SOP", async () => {
    const sop = await readSeedSop();

    expect(sop.kind).toBe("single_node_sop");
    expect(sop.nodes).toHaveLength(11);
    expect(sop.subprocesses).toHaveLength(6);
  });

  it("rejects a gate without task_id", async () => {
    const sop = await readSeedSop();
    const gate = sop.nodes.find((node) => node.kind === "gate");
    if (!gate || gate.kind !== "gate") {
      throw new Error("seed gate missing");
    }
    const invalid = {
      ...sop,
      nodes: sop.nodes.map((node) =>
        node.id === gate.id ? { ...node, task_id: "" } : node
      )
    };

    const result = sopGraphSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it("rejects a boundary without allowed paths", async () => {
    const sop = await readSeedSop();
    const boundary = sop.nodes.find((node) => node.kind === "boundary");
    if (!boundary || boundary.kind !== "boundary") {
      throw new Error("seed boundary missing");
    }
    const invalid = {
      ...sop,
      nodes: sop.nodes.map((node) =>
        node.id === boundary.id ? { ...node, allowed_paths: [] } : node
      )
    };

    const result = sopGraphSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it("rejects invalid edge pairings", async () => {
    const sop = await readSeedSop();
    const invalid = {
      ...sop,
      edges: [
        ...sop.edges,
        { id: "edge_bad", from: "intent", to: "gate_tests", kind: "produces" }
      ]
    };

    const result = sopGraphSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it("rejects subprocess edges that point outside subprocess nodes and attachments", async () => {
    const sop = await readSeedSop();
    const invalid = {
      ...sop,
      subprocesses: sop.subprocesses.map((subprocess) =>
        subprocess.parent_step_id === "research"
          ? {
              ...subprocess,
              edges: [
                ...subprocess.edges,
                {
                  id: "edge_research_bad_external",
                  from: "research_local_artifacts",
                  to: "execute",
                  kind: "sequence"
                }
              ]
            }
          : subprocess
      )
    };

    const result = sopGraphSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });
});
