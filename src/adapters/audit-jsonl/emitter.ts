import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { type AuditJsonlBundle } from "./compiler.js";
import { bundleToJsonlFiles } from "./files.js";

export async function writeAuditJsonlBundle(bundle: AuditJsonlBundle, outDir: string) {
  await mkdir(outDir, { recursive: true });
  const files = bundleToJsonlFiles(bundle);
  for (const [fileName, contents] of Object.entries(files)) {
    await writeFile(join(outDir, fileName), contents, "utf8");
  }
}
