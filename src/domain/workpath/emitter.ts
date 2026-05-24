import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { AUDIT_JSONL_FILES } from "../../adapters/audit-jsonl/compiler.js";
import { type SopGraph } from "../sop/index.js";
import { buildWorkpathExportFiles, type WorkpathExportOptions } from "./export.js";
import {
  WORKPATH_GENERATED_PACKET_FILES,
  WORKPATH_PROGRAM_FILE
} from "./packet.js";

export async function writeWorkpathExport(
  source: SopGraph,
  outDir: string,
  options: WorkpathExportOptions = {}
): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await removeOwnedExportFiles(outDir);
  const files = buildWorkpathExportFiles(source, options);
  for (const [fileName, contents] of Object.entries(files)) {
    const target = join(outDir, fileName);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents, "utf8");
  }
}

async function removeOwnedExportFiles(outDir: string): Promise<void> {
  const ownedFiles = [
    ...AUDIT_JSONL_FILES,
    "sop.json",
    "canvas.json",
    "workpath.json",
    WORKPATH_PROGRAM_FILE,
    ...WORKPATH_GENERATED_PACKET_FILES
  ];
  await Promise.all(ownedFiles.map((fileName) => rm(join(outDir, fileName), { force: true })));
}
