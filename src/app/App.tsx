import { type CSSProperties, useEffect, useMemo, useState } from "react";

import { seedSop } from "./seed.js";
import { findSopSelection, subprocessForStep } from "../domain/sop/index.js";
import { SopCanvas } from "../ui/canvas/SopCanvas.js";
import { type CanvasScope } from "../ui/canvas/flowModel.js";
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
  const initialState = useMemo(() => initialAppState(), []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(initialState.selectedNodeId);
  const [viewStepId, setViewStepId] = useState<string | undefined>(initialState.viewStepId);
  const selected = findSopSelection(seedSop, selectedNodeId);
  const scope: CanvasScope = viewStepId ? { kind: "subprocess", stepId: viewStepId } : { kind: "overview" };
  const srNodes = [
    ...seedSop.nodes.map((node) => ({ id: node.id, kind: node.kind, title: node.title })),
    ...seedSop.subprocesses.flatMap((subprocess) =>
      subprocess.nodes.map((node) => ({ id: node.id, kind: node.kind, title: node.title }))
    )
  ];

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("view", viewStepId ?? "overview");
    if (selectedNodeId) {
      params.set("selected", selectedNodeId);
    }
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [selectedNodeId, viewStepId]);

  function handleSelectNode(nodeId?: string) {
    const selection = findSopSelection(seedSop, nodeId);
    if (selection?.parentStepId && selection.node.kind !== "step") {
      setViewStepId(selection.parentStepId);
    }
    setSelectedNodeId(nodeId);
  }

  function handleOpenStep(stepId: string) {
    if (!subprocessForStep(seedSop, stepId)) {
      return;
    }
    setViewStepId(stepId);
    setSelectedNodeId(stepId);
  }

  function handleBackToOverview() {
    setSelectedNodeId(viewStepId ?? seedSop.entry_node_id);
    setViewStepId(undefined);
  }

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
              onClick={() => handleSelectNode(node.id)}
            >
              {node.title}
            </button>
          ))}
        </nav>
        <SopCanvas
          scope={scope}
          sop={seedSop}
          selectedNodeId={selectedNodeId}
          onBackToOverview={handleBackToOverview}
          onOpenStep={handleOpenStep}
          onSelectNode={handleSelectNode}
        />
        <SopInspector sop={seedSop} selection={selected} />
      </section>
    </main>
  );
}

function initialAppState(): { selectedNodeId: string; viewStepId?: string } {
  const params = new URLSearchParams(window.location.search);
  const requestedView = params.get("view");
  const requestedSelection = params.get("selected");
  let selectedNodeId =
    requestedSelection && findSopSelection(seedSop, requestedSelection) ? requestedSelection : seedSop.entry_node_id;
  let viewStepId =
    requestedView && requestedView !== "overview" && subprocessForStep(seedSop, requestedView)
      ? requestedView
      : undefined;

  const selected = findSopSelection(seedSop, selectedNodeId);
  if (!viewStepId && selected?.parentStepId && selected.node.kind !== "step") {
    viewStepId = selected.parentStepId;
  }

  if (viewStepId) {
    const scopedSelection = findSopSelection(seedSop, selectedNodeId);
    const selectedBelongsToScope =
      scopedSelection?.parentStepId === viewStepId ||
      (scopedSelection?.node.kind === "step" && scopedSelection.node.id === viewStepId);
    if (!selectedBelongsToScope) {
      selectedNodeId = viewStepId;
    }
  }

  return { selectedNodeId, viewStepId };
}

function formatKind(kind: string): string {
  return kind
    .split("_")
    .map((part) => (part.toLowerCase() === "sop" ? "SOP" : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}
