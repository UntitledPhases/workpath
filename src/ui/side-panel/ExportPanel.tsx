import { useMemo, useState } from "react";
import { type ZodIssue } from "zod";

import { buildWorkpathExportFiles, buildZip } from "../../domain/workpath/index.js";
import { type SopGraph } from "../../domain/sop/index.js";

interface ExportPanelProps {
  dirty: boolean;
  issues: ZodIssue[];
  onReset: () => void;
  sop: SopGraph;
  valid: boolean;
}

export function ExportPanel({ dirty, issues, onReset, sop, valid }: ExportPanelProps) {
  const [selectedFile, setSelectedFile] = useState("sop.json");
  const files = useMemo(() => (valid ? buildWorkpathExportFiles(sop) : undefined), [sop, valid]);
  const fileNames = files ? Object.keys(files).sort() : [];
  const previewName = files?.[selectedFile] ? selectedFile : fileNames[0];
  const preview = previewName && files ? files[previewName] : "";

  function downloadZip() {
    if (!files) {
      return;
    }
    const zip = buildZip(files);
    const blob = new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sop.id || "workpath"}-ideate-bundle.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <aside className="export-panel" data-testid="export-panel">
      <div className="export-panel-header">
        <div>
          <span>Export</span>
          <strong>{valid ? "Ready" : "Blocked"}</strong>
        </div>
        <span className={dirty ? "dirty-indicator is-dirty" : "dirty-indicator"}>{dirty ? "edited" : "seed"}</span>
      </div>
      {valid ? (
        <>
          <p>{fileNames.length} files compile from the current draft.</p>
          <div className="export-actions">
            <button type="button" onClick={downloadZip}>
              Download ZIP
            </button>
            <button type="button" onClick={onReset}>
              Reset
            </button>
          </div>
          <label className="field">
            <span>preview</span>
            <select value={previewName} onChange={(event) => setSelectedFile(event.target.value)}>
              {fileNames.map((fileName) => (
                <option key={fileName} value={fileName}>
                  {fileName}
                </option>
              ))}
            </select>
          </label>
          <pre className="export-preview">{preview.slice(0, 2200) || "(empty file)"}</pre>
        </>
      ) : (
        <div className="validation-issues">
          {issues.slice(0, 5).map((issue) => (
            <p key={`${issue.path.join(".")}:${issue.message}`}>
              {issue.path.join(".") || "sop"}: {issue.message}
            </p>
          ))}
        </div>
      )}
    </aside>
  );
}
