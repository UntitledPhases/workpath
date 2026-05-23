import {
  type CanvasNode,
  type SopGraph,
  type SopNode,
  type SopSubprocess,
  type SubprocessEdge,
  type SubprocessNode
} from "./schema.js";

export function cloneSop(sop: SopGraph): SopGraph {
  return structuredClone(sop);
}

export function updateSopNode(
  sop: SopGraph,
  nodeId: string,
  updater: (node: SopNode) => SopNode
): SopGraph {
  return {
    ...sop,
    nodes: sop.nodes.map((node) => (node.id === nodeId ? updater(node) : node))
  };
}

export function updateSubprocessNode(
  sop: SopGraph,
  nodeId: string,
  updater: (node: SubprocessNode) => SubprocessNode
): SopGraph {
  return {
    ...sop,
    subprocesses: sop.subprocesses.map((subprocess) => ({
      ...subprocess,
      nodes: subprocess.nodes.map((node) => (node.id === nodeId ? updater(node) : node))
    }))
  };
}

export function updateCanvasPosition(
  sop: SopGraph,
  nodeId: string,
  position: { x: number; y: number },
  parentStepId?: string
): SopGraph {
  const rounded = {
    x: Math.round(position.x),
    y: Math.round(position.y)
  };

  if (parentStepId) {
    return {
      ...sop,
      subprocesses: sop.subprocesses.map((subprocess) =>
        subprocess.parent_step_id === parentStepId
          ? {
              ...subprocess,
              canvas: {
                nodes: upsertCanvasNode(subprocess.canvas.nodes, nodeId, rounded)
              }
            }
          : subprocess
      )
    };
  }

  return {
    ...sop,
    canvas: {
      ...sop.canvas,
      nodes: upsertCanvasNode(sop.canvas.nodes, nodeId, rounded)
    }
  };
}

export function addActivity(sop: SopGraph, parentStepId: string): { activityId: string; sop: SopGraph } {
  const subprocess = sop.subprocesses.find((candidate) => candidate.parent_step_id === parentStepId);
  if (!subprocess) {
    return { activityId: "", sop };
  }

  const activityId = uniqueActivityId(sop, parentStepId);
  const activity: SubprocessNode = {
    id: activityId,
    kind: "activity",
    title: "New activity"
  };
  const positioned = appendActivityPosition(subprocess, activityId);
  const nextSubprocess = repairSubprocessSequence({
    ...positioned,
    nodes: [...subprocess.nodes, activity]
  });

  return {
    activityId,
    sop: replaceSubprocess(sop, nextSubprocess)
  };
}

export function deleteActivity(sop: SopGraph, parentStepId: string, activityId: string): SopGraph {
  const subprocess = sop.subprocesses.find((candidate) => candidate.parent_step_id === parentStepId);
  if (!subprocess || subprocess.nodes.length <= 1) {
    return sop;
  }

  const remainingNodeIds = new Set(subprocess.nodes.filter((node) => node.id !== activityId).map((node) => node.id));
  const attachedNodeIds = new Set(subprocess.attached_node_ids);
  const endpointIds = new Set([...remainingNodeIds, ...attachedNodeIds]);
  const nextSubprocess = repairSubprocessSequence({
    ...subprocess,
    nodes: subprocess.nodes.filter((node) => node.id !== activityId),
    edges: subprocess.edges.filter((edge) => endpointIds.has(edge.from) && endpointIds.has(edge.to)),
    canvas: {
      nodes: subprocess.canvas.nodes.filter((node) => node.id !== activityId)
    }
  });

  return replaceSubprocess(sop, reflowActivityPositions(nextSubprocess));
}

export function moveActivity(sop: SopGraph, parentStepId: string, activityId: string, direction: -1 | 1): SopGraph {
  const subprocess = sop.subprocesses.find((candidate) => candidate.parent_step_id === parentStepId);
  if (!subprocess) {
    return sop;
  }

  const fromIndex = subprocess.nodes.findIndex((node) => node.id === activityId);
  const toIndex = fromIndex + direction;
  if (fromIndex < 0 || toIndex < 0 || toIndex >= subprocess.nodes.length) {
    return sop;
  }

  const nodes = [...subprocess.nodes];
  const [moved] = nodes.splice(fromIndex, 1);
  nodes.splice(toIndex, 0, moved);
  const nextSubprocess = reflowActivityPositions(repairSubprocessSequence({ ...subprocess, nodes }));
  return replaceSubprocess(sop, nextSubprocess);
}

function replaceSubprocess(sop: SopGraph, nextSubprocess: SopSubprocess): SopGraph {
  return {
    ...sop,
    subprocesses: sop.subprocesses.map((subprocess) =>
      subprocess.parent_step_id === nextSubprocess.parent_step_id ? nextSubprocess : subprocess
    )
  };
}

function upsertCanvasNode(
  nodes: CanvasNode[],
  nodeId: string,
  position: { x: number; y: number }
): CanvasNode[] {
  if (nodes.some((node) => node.id === nodeId)) {
    return nodes.map((node) => (node.id === nodeId ? { id: nodeId, ...position } : node));
  }
  return [...nodes, { id: nodeId, ...position }];
}

function repairSubprocessSequence(subprocess: SopSubprocess): SopSubprocess {
  const nonSequenceEdges = subprocess.edges.filter((edge) => edge.kind !== "sequence");
  const sequenceEdges: SubprocessEdge[] = [];
  for (let index = 0; index < subprocess.nodes.length - 1; index += 1) {
    const from = subprocess.nodes[index].id;
    const to = subprocess.nodes[index + 1].id;
    sequenceEdges.push({
      id: uniqueEdgeId([...nonSequenceEdges, ...sequenceEdges], `edge_${from}_${to}`),
      from,
      kind: "sequence",
      to
    });
  }
  return {
    ...subprocess,
    edges: [...sequenceEdges, ...nonSequenceEdges]
  };
}

function reflowActivityPositions(subprocess: SopSubprocess): SopSubprocess {
  const positions = new Map(subprocess.canvas.nodes.map((node) => [node.id, node]));
  const activityPositions = subprocess.nodes
    .map((node) => positions.get(node.id))
    .filter((node): node is CanvasNode => Boolean(node));
  const startX = activityPositions.length ? Math.min(...activityPositions.map((node) => node.x)) : 180;
  const y = activityPositions.length
    ? Math.round(activityPositions.reduce((sum, node) => sum + node.y, 0) / activityPositions.length)
    : 330;
  const spacing = inferActivitySpacing(activityPositions);
  const reflowed = new Map(
    subprocess.nodes.map((node, index) => [
      node.id,
      {
        id: node.id,
        x: startX + spacing * index,
        y
      }
    ])
  );

  return {
    ...subprocess,
    canvas: {
      nodes: subprocess.canvas.nodes.map((node) => reflowed.get(node.id) ?? node)
    }
  };
}

function appendActivityPosition(subprocess: SopSubprocess, activityId: string): SopSubprocess {
  const positions = new Map(subprocess.canvas.nodes.map((node) => [node.id, node]));
  const activityPositions = subprocess.nodes
    .map((node) => positions.get(node.id))
    .filter((node): node is CanvasNode => Boolean(node));
  const spacing = inferActivitySpacing(activityPositions);
  const lastX = activityPositions.length ? Math.max(...activityPositions.map((node) => node.x)) : 180 - spacing;
  const y = activityPositions.length
    ? Math.round(activityPositions.reduce((sum, node) => sum + node.y, 0) / activityPositions.length)
    : 330;
  return {
    ...subprocess,
    canvas: {
      nodes: [...subprocess.canvas.nodes, { id: activityId, x: lastX + spacing, y }]
    }
  };
}

function inferActivitySpacing(positions: CanvasNode[]): number {
  const sortedX = [...new Set(positions.map((node) => node.x))].sort((a, b) => a - b);
  const deltas = sortedX
    .slice(1)
    .map((x, index) => x - sortedX[index])
    .filter((delta) => delta > 0);
  if (!deltas.length) {
    return 240;
  }
  return Math.max(180, Math.round(deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length));
}

function uniqueActivityId(sop: SopGraph, parentStepId: string): string {
  const ids = new Set([
    ...sop.nodes.map((node) => node.id),
    ...sop.subprocesses.flatMap((subprocess) => subprocess.nodes.map((node) => node.id))
  ]);
  const base = `${parentStepId}_activity`;
  let index = 1;
  while (ids.has(`${base}_${index}`)) {
    index += 1;
  }
  return `${base}_${index}`;
}

function uniqueEdgeId(edges: SubprocessEdge[], base: string): string {
  const ids = new Set(edges.map((edge) => edge.id));
  if (!ids.has(base)) {
    return base;
  }
  let index = 2;
  while (ids.has(`${base}_${index}`)) {
    index += 1;
  }
  return `${base}_${index}`;
}
