import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { type IdeateBundle, IDEATE_FILES } from "./compiler.js";
import { type SopGraph } from "../sop/schema.js";

export interface EmitOptions {
  includeSource?: boolean;
  exportMode?: "specification";
  compilerVersion?: string;
}

export function bundleToJsonlFiles(bundle: IdeateBundle): Record<string, string> {
  const files: Record<string, string> = {};
  for (const fileName of IDEATE_FILES) {
    files[fileName] = recordsToJsonl(bundle[fileName]);
  }
  return files;
}

export async function writeIdeateBundle(
  bundle: IdeateBundle,
  outDir: string,
  source?: SopGraph,
  options: EmitOptions = {}
) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const files = bundleToJsonlFiles(bundle);
  for (const [fileName, contents] of Object.entries(files)) {
    await writeFile(join(outDir, fileName), contents, "utf8");
  }
  if (options.includeSource && source) {
    await writeFile(join(outDir, "sop.json"), JSON.stringify(source, null, 2) + "\n", "utf8");
    await writeFile(join(outDir, "canvas.json"), JSON.stringify(source.canvas, null, 2) + "\n", "utf8");
    await writeFile(
      join(outDir, "workpath.json"),
      JSON.stringify(
        {
          schema_version: "1.0",
          kind: "workpath_export_manifest",
          sop_id: source.id,
          export_mode: options.exportMode ?? "specification",
          compiler: options.compilerVersion ?? "workpath-compiler@0.1.0"
        },
        null,
        2
      ) + "\n",
      "utf8"
    );
  }
}

export function recordsToJsonl(records: unknown[]): string {
  if (records.length === 0) {
    return "";
  }
  return records.map((record) => JSON.stringify(record)).join("\n") + "\n";
}
