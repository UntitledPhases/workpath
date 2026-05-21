import {
  type SopGraph,
  type SopNode,
  type SopSubprocess,
  type StepNode,
  type SubprocessNode
} from "./schema.js";

export type SopSelection =
  | {
      kind: "sop_node";
      node: SopNode;
      parentStepId?: string;
    }
  | {
      kind: "subprocess_node";
      node: SubprocessNode;
      parentStepId: string;
    };

export function processSteps(sop: SopGraph): StepNode[] {
  return sop.nodes.filter((node): node is StepNode => node.kind === "step");
}

export function subprocessForStep(sop: SopGraph, stepId: string): SopSubprocess | undefined {
  return sop.subprocesses.find((subprocess) => subprocess.parent_step_id === stepId);
}

export function findSopSelection(sop: SopGraph, id?: string): SopSelection | undefined {
  if (!id) {
    return undefined;
  }

  const node = sop.nodes.find((candidate) => candidate.id === id);
  if (node) {
    return {
      kind: "sop_node",
      node,
      parentStepId: node.kind === "step" ? node.id : parentStepIdForNode(sop, node.id)
    };
  }

  for (const subprocess of sop.subprocesses) {
    const subprocessNode = subprocess.nodes.find((candidate) => candidate.id === id);
    if (subprocessNode) {
      return {
        kind: "subprocess_node",
        node: subprocessNode,
        parentStepId: subprocess.parent_step_id
      };
    }
  }

  return undefined;
}

export function activeStepIdForSelection(sop: SopGraph, id?: string): string | undefined {
  return findSopSelection(sop, id)?.parentStepId;
}

export function attachedNodesForStep(sop: SopGraph, stepId: string): SopNode[] {
  const subprocess = subprocessForStep(sop, stepId);
  if (!subprocess) {
    return [];
  }

  return subprocess.attached_node_ids
    .map((id) => sop.nodes.find((node) => node.id === id))
    .filter((node): node is SopNode => Boolean(node));
}

function parentStepIdForNode(sop: SopGraph, nodeId: string): string | undefined {
  const explicitParent = sop.subprocesses.find((subprocess) => subprocess.attached_node_ids.includes(nodeId));
  if (explicitParent) {
    return explicitParent.parent_step_id;
  }

  const node = sop.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    return undefined;
  }
  if (node.kind === "gate" || node.kind === "boundary") {
    return node.task_id;
  }
  if (node.kind === "evidence") {
    const gate = sop.nodes.find(
      (candidate) => candidate.kind === "gate" && candidate.required_evidence.includes(node.id)
    );
    return gate?.kind === "gate" ? gate.task_id : undefined;
  }
  return node.id;
}
