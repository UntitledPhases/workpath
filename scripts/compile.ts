import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { sopGraphSchema } from "../src/domain/sop/index.js";
import { writeWorkpathExport } from "../src/domain/workpath/emitter.js";

const seedPath = resolve("examples/seed-project-sop.json");
const outDir = resolve("examples/exported-project-sop");

const raw = await readFile(seedPath, "utf8");
const sop = sopGraphSchema.parse(JSON.parse(raw));
await writeWorkpathExport(sop, outDir, {
  createdAt: "2026-05-20T20:00:00.000Z",
  compilerVersion: "workpath-compiler@0.1.0"
});
console.log(`Compiled ${seedPath} -> ${outDir}`);
