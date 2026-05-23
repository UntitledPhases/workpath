import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { type IdeateBundle, IDEATE_FILES } from "./compiler.js";
import { type SopGraph } from "../sop/schema.js";
import { compileToWorkflowProgram } from "../workpath/program.js";

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
  await mkdir(outDir, { recursive: true });
  await removeOwnedOutputFiles(outDir, Boolean(options.includeSource));
  const files = bundleToJsonlFiles(bundle);
  for (const [fileName, contents] of Object.entries(files)) {
    await writeFile(join(outDir, fileName), contents, "utf8");
  }
  if (options.includeSource && source) {
    await writeFile(join(outDir, "sop.json"), JSON.stringify(source, null, 2) + "\n", "utf8");
    await writeFile(join(outDir, "canvas.json"), JSON.stringify(source.canvas, null, 2) + "\n", "utf8");
    await mkdir(join(outDir, ".workpath"), { recursive: true });
    await writeFile(
      join(outDir, ".workpath", "workflow_program.json"),
      JSON.stringify(compileToWorkflowProgram(source), null, 2) + "\n",
      "utf8"
    );
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

async function removeOwnedOutputFiles(outDir: string, includeSource: boolean): Promise<void> {
  const ownedFiles = includeSource
    ? [...IDEATE_FILES, "sop.json", "canvas.json", "workpath.json", join(".workpath", "workflow_program.json")]
    : IDEATE_FILES;
  await Promise.all(ownedFiles.map((fileName) => rm(join(outDir, fileName), { force: true })));
}

export function recordsToJsonl(records: unknown[]): string {
  if (records.length === 0) {
    return "";
  }
  return records.map((record) => JSON.stringify(record)).join("\n") + "\n";
}
