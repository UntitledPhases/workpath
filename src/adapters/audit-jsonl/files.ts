import { type AuditJsonlBundle, AUDIT_JSONL_FILES } from "./compiler.js";

export function bundleToJsonlFiles(bundle: AuditJsonlBundle): Record<string, string> {
  const files: Record<string, string> = {};
  for (const fileName of AUDIT_JSONL_FILES) {
    files[fileName] = recordsToJsonl(bundle[fileName]);
  }
  return files;
}

export function recordsToJsonl(records: unknown[]): string {
  if (records.length === 0) {
    return "";
  }
  return records.map((record) => JSON.stringify(record)).join("\n") + "\n";
}
