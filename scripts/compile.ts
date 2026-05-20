import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { compileToIdeateBundle, writeIdeateBundle } from "../src/domain/ideate/index.js";
import { sopGraphSchema } from "../src/domain/sop/index.js";

const seedPath = resolve("examples/seed-project-sop.json");
const outDir = resolve("examples/exported-project-sop");

const raw = await readFile(seedPath, "utf8");
const sop = sopGraphSchema.parse(JSON.parse(raw));
const bundle = compileToIdeateBundle(sop, {
  createdAt: "2026-05-20T20:00:00.000Z",
  compilerVersion: "workpath-compiler@0.1.0"
});

await writeIdeateBundle(bundle, outDir, sop, { includeSource: true });
console.log(`Compiled ${seedPath} -> ${outDir}`);

