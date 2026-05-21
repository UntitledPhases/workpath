import { type CSSProperties, useState } from "react";

import { seedSop } from "./seed.js";
import { findSopSelection } from "../domain/sop/index.js";
import { SopCanvas } from "../ui/canvas/SopCanvas.js";
import { SopInspector } from "../ui/side-panel/SopInspector.js";

const MODULE_LEGEND = [
  { label: "Intent", color: "#2563eb" },
  { label: "Research", color: "#4f46e5" },
  { label: "Plan", color: "#9333ea" },
  { label: "Execute", color: "#16a34a" },
  { label: "Verify", color: "#d97706" },
  { label: "Return", color: "#0f766e" }
];

export function App() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(initialSelectedNodeId());
  const selected = findSopSelection(seedSop, selectedNodeId);
  const srNodes = [
    ...seedSop.nodes.map((node) => ({ id: node.id, kind: node.kind, title: node.title })),
    ...seedSop.subprocesses.flatMap((subprocess) =>
      subprocess.nodes.map((node) => ({ id: node.id, kind: node.kind, title: node.title }))
    )
  ];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Workpath</div>
          <h1>{seedSop.title}</h1>
        </div>
        <div className="status-strip">
          <span>{formatKind(seedSop.kind)}</span>
          <span>6 process nodes</span>
          <span>{seedSop.subprocesses.length} detail graphs</span>
        </div>
      </header>
      <div className="module-legend" aria-label="Module colors">
        {MODULE_LEGEND.map((item) => (
          <span className="legend-item" key={item.label}>
            <span className="legend-swatch" style={{ "--module-border": item.color } as CSSProperties} />
            {item.label}
          </span>
        ))}
      </div>
      <section className="workspace">
        <nav className="sr-node-index" aria-label="SOP nodes">
          {srNodes.map((node) => (
            <button
              key={node.id}
              type="button"
              aria-label={`Select ${node.kind}: ${node.title}`}
              aria-pressed={node.id === selectedNodeId}
              onClick={() => setSelectedNodeId(node.id)}
            >
              {node.title}
            </button>
          ))}
        </nav>
        <SopCanvas sop={seedSop} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
        <SopInspector sop={seedSop} selection={selected} />
      </section>
    </main>
  );
}

function initialSelectedNodeId(): string {
  const selected = new URLSearchParams(window.location.search).get("selected");
  return selected && findSopSelection(seedSop, selected) ? selected : seedSop.entry_node_id;
}

function formatKind(kind: string): string {
  return kind
    .split("_")
    .map((part) => (part.toLowerCase() === "sop" ? "SOP" : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}
