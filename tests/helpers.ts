import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { sopGraphSchema, type SopGraph } from "../src/domain/sop/index.js";

export async function readSeedSop(): Promise<SopGraph> {
  const raw = await readFile(resolve("examples/seed-project-sop.json"), "utf8");
  return sopGraphSchema.parse(JSON.parse(raw));
}

