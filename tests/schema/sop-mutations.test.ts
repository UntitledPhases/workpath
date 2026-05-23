import { describe, expect, it } from "vitest";

import {
  addActivity,
  deleteActivity,
  moveActivity,
  sopGraphSchema,
  updateCanvasPosition,
  updateSopNode,
  updateSubprocessNode
} from "../../src/domain/sop/index.js";
import { readSeedSop } from "../helpers.js";

describe("SOP mutations", () => {
  it("updates top-level and nested nodes while preserving schema validity", async () => {
    const seed = await readSeedSop();
    const renamedStep = updateSopNode(seed, "execute", (node) =>
      node.kind === "step" ? { ...node, title: "Run work" } : node
    );
    const renamedActivity = updateSubprocessNode(renamedStep, "execute_delegate_worker", (node) => ({
      ...node,
      title: "Send handoff"
    }));

    expect(sopGraphSchema.safeParse(renamedActivity).success).toBe(true);
    expect(renamedActivity.nodes.find((node) => node.id === "execute")?.title).toBe("Run work");
    expect(
      renamedActivity.subprocesses
        .find((subprocess) => subprocess.parent_step_id === "execute")
        ?.nodes.find((node) => node.id === "execute_delegate_worker")?.title
    ).toBe("Send handoff");
  });

  it("adds, moves, and deletes nested process activities with repaired sequence edges", async () => {
    const seed = await readSeedSop();
    const added = addActivity(seed, "execute");
    const moved = moveActivity(added.sop, "execute", added.activityId, -1);
    const deleted = deleteActivity(moved, "execute", "execute_delegate_worker");
    const execute = deleted.subprocesses.find((subprocess) => subprocess.parent_step_id === "execute");

    expect(added.activityId).toBe("execute_activity_1");
    expect(sopGraphSchema.safeParse(deleted).success).toBe(true);
    expect(execute?.nodes.map((node) => node.id)).toEqual([
      "execute_confirm_scope",
      "execute_activity_1",
      "execute_integrate"
    ]);
    expect(execute?.edges.filter((edge) => edge.kind === "sequence").map((edge) => [edge.from, edge.to])).toEqual([
      ["execute_confirm_scope", "execute_activity_1"],
      ["execute_activity_1", "execute_integrate"]
    ]);
  });

  it("persists overview and nested process canvas positions", async () => {
    const seed = await readSeedSop();
    const movedOverview = updateCanvasPosition(seed, "execute", { x: 777.2, y: 188.8 });
    const movedNested = updateCanvasPosition(movedOverview, "execute_delegate_worker", { x: 544.2, y: 344.8 }, "execute");

    expect(movedNested.canvas.nodes.find((node) => node.id === "execute")).toMatchObject({ x: 777, y: 189 });
    expect(
      movedNested.subprocesses
        .find((subprocess) => subprocess.parent_step_id === "execute")
        ?.canvas.nodes.find((node) => node.id === "execute_delegate_worker")
    ).toMatchObject({ x: 544, y: 345 });
  });
});
