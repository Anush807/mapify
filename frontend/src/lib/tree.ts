import type { RoadmapNode } from './types';

export function countNodes(nodes: RoadmapNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countNodes(node.children), 0);
}

export function collectIds(nodes: RoadmapNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...collectIds(node.children)]);
}

/** A branch counts as done only when the node and everything under it is done. */
export function isBranchComplete(node: RoadmapNode, completed: Set<string>): boolean {
  if (!completed.has(node.id)) return false;
  return node.children.every((child) => isBranchComplete(child, completed));
}
