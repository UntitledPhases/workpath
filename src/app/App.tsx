import { useMemo, useState } from "react";

import { seedSop } from "./seed.js";
import { SopCanvas } from "../ui/canvas/SopCanvas.js";
import { SopInspector } from "../ui/side-panel/SopInspector.js";

export function App() {
  const [selectedNodeId, setSelectedNodeId] = useState(seedSop.entry_node_id);
  const selectedNode = useMemo(
    () => seedSop.nodes.find((node) => node.id === selectedNodeId) ?? seedSop.nodes[0],
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
          <span>{seedSop.kind.replaceAll("_", " ")}</span>
          <span>{seedSop.nodes.length} nodes</span>
          <span>{seedSop.edges.length} edges</span>
        </div>
      </header>
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
        <SopCanvas sop={seedSop} selectedNodeId={selectedNode?.id} onSelectNode={setSelectedNodeId} />
        <SopInspector sop={seedSop} node={selectedNode} />
      </section>
    </main>
  );
}
