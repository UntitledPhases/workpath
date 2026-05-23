import { type CSSProperties, useEffect, useMemo, useState } from "react";

import { seedSop } from "./seed.js";
import {
  addActivity,
  cloneSop,
  deleteActivity,
  findSopSelection,
  moveActivity,
  sopGraphSchema,
  subprocessForStep,
  type SopGraph,
  type SopNode,
  type SubprocessNode,
  updateCanvasPosition,
  updateSopNode,
  updateSubprocessNode
} from "../domain/sop/index.js";
import { SopCanvas } from "../ui/canvas/SopCanvas.js";
import { type CanvasScope } from "../ui/canvas/flowModel.js";
import { ExportPanel } from "../ui/side-panel/ExportPanel.js";
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
  const [draftSop, setDraftSop] = useState<SopGraph>(() => cloneSop(seedSop));
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(initialState.selectedNodeId);
  const [viewStepId, setViewStepId] = useState<string | undefined>(initialState.viewStepId);
  const validation = useMemo(() => sopGraphSchema.safeParse(draftSop), [draftSop]);
  const selected = findSopSelection(draftSop, selectedNodeId);
  const scope: CanvasScope = viewStepId ? { kind: "subprocess", stepId: viewStepId } : { kind: "overview" };
  const srNodes = [
    ...draftSop.nodes.map((node) => ({ id: node.id, kind: node.kind, title: node.title })),
    ...draftSop.subprocesses.flatMap((subprocess) =>
      subprocess.nodes.map((node) => ({ id: node.id, kind: node.kind, title: node.title }))
    )
  ];
  const dirty = useMemo(() => JSON.stringify(draftSop) !== JSON.stringify(seedSop), [draftSop]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("view", viewStepId ?? "overview");
    if (selectedNodeId) {
      params.set("selected", selectedNodeId);
    }
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [selectedNodeId, viewStepId]);

  function handleSelectNode(nodeId?: string) {
    const selection = findSopSelection(draftSop, nodeId);
    if (selection?.parentStepId && selection.node.kind !== "step") {
      setViewStepId(selection.parentStepId);
    }
    setSelectedNodeId(nodeId);
  }

  function handleOpenStep(stepId: string) {
    if (!subprocessForStep(draftSop, stepId)) {
      return;
    }
    setViewStepId(stepId);
    setSelectedNodeId(stepId);
  }

  function handleBackToOverview() {
    setSelectedNodeId(viewStepId ?? draftSop.entry_node_id);
    setViewStepId(undefined);
  }

  function handleUpdateNode(nodeId: string, updater: (node: SopNode) => SopNode) {
    setDraftSop((current) => updateSopNode(current, nodeId, updater));
  }

  function handleUpdateSubprocessNode(nodeId: string, updater: (node: SubprocessNode) => SubprocessNode) {
    setDraftSop((current) => updateSubprocessNode(current, nodeId, updater));
  }

  function handleAddActivity(parentStepId: string) {
    setDraftSop((current) => {
      const result = addActivity(current, parentStepId);
      if (result.activityId) {
        setSelectedNodeId(result.activityId);
        setViewStepId(parentStepId);
      }
      return result.sop;
    });
  }

  function handleDeleteActivity(parentStepId: string, activityId: string) {
    setDraftSop((current) => deleteActivity(current, parentStepId, activityId));
    setSelectedNodeId(parentStepId);
  }

  function handleMoveActivity(parentStepId: string, activityId: string, direction: -1 | 1) {
    setDraftSop((current) => moveActivity(current, parentStepId, activityId, direction));
  }

  function handleMoveNode(nodeId: string, position: { x: number; y: number }, parentStepId?: string) {
    setDraftSop((current) => updateCanvasPosition(current, nodeId, position, parentStepId));
  }

  function handleReset() {
    setDraftSop(cloneSop(seedSop));
    setSelectedNodeId(seedSop.entry_node_id);
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
          <span>{formatKind(draftSop.kind)}</span>
          <span>{draftSop.nodes.filter((node) => node.kind === "step").length} process nodes</span>
          <span>{draftSop.subprocesses.length} nested processes</span>
          <span>{validation.success ? "valid draft" : "invalid draft"}</span>
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
          sop={draftSop}
          selectedNodeId={selectedNodeId}
          onBackToOverview={handleBackToOverview}
          onMoveNode={handleMoveNode}
          onOpenStep={handleOpenStep}
          onSelectNode={handleSelectNode}
        />
        <div className="side-rail">
          <SopInspector
            onAddActivity={handleAddActivity}
            onDeleteActivity={handleDeleteActivity}
            onMoveActivity={handleMoveActivity}
            onUpdateNode={handleUpdateNode}
            onUpdateSubprocessNode={handleUpdateSubprocessNode}
            sop={draftSop}
            selection={selected}
          />
          <ExportPanel
            dirty={dirty}
            issues={validation.success ? [] : validation.error.issues}
            onReset={handleReset}
            sop={draftSop}
            valid={validation.success}
          />
        </div>
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
