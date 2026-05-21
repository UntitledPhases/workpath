import { type CSSProperties, useMemo, useState } from "react";

import { seedSop } from "./seed.js";
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(seedSop.entry_node_id);
  const selectedNode = useMemo(
    () => (selectedNodeId ? seedSop.nodes.find((node) => node.id === selectedNodeId) : undefined),
    [selectedNodeId]
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Workpath</div>
          <h1>{seedSop.title}</h1>
        </div>
        <div className="status-strip">
          <span>{formatKind(seedSop.kind)}</span>
          <span>{seedSop.nodes.length} nodes</span>
          <span>{seedSop.edges.length} edges</span>
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
          {seedSop.nodes.map((node) => (
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
        <SopInspector sop={seedSop} node={selectedNode} />
      </section>
    </main>
  );
}

function formatKind(kind: string): string {
  return kind
    .split("_")
    .map((part) => (part.toLowerCase() === "sop" ? "SOP" : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}
