import type { RoadmapNode } from './types';

export type NodeState = 'completed' | 'current' | 'upcoming';

/** Depth-first pre-order — the order a learner actually walks the path. */
export function walk(nodes: RoadmapNode[]): RoadmapNode[] {
  return nodes.flatMap((node) => [node, ...walk(node.children)]);
}

/**
 * "Current" is the first unchecked node along the walk. There is exactly one,
 * and it's the single thing the view most needs to communicate.
 */
export function findCurrentNodeId(
  nodes: RoadmapNode[],
  completed: Set<string>,
): string | null {
  for (const node of walk(nodes)) {
    if (!completed.has(node.id)) return node.id;
  }
  return null;
}

export function nodeState(
  nodeId: string,
  completed: Set<string>,
  currentId: string | null,
): NodeState {
  if (completed.has(nodeId)) return 'completed';
  if (nodeId === currentId) return 'current';
  return 'upcoming';
}

/** Every id in this node's subtree, including its own. */
export function subtreeIds(node: RoadmapNode): string[] {
  return [node.id, ...node.children.flatMap(subtreeIds)];
}

/** A subtree nobody has touched can start collapsed without hiding progress. */
export function isSubtreeUntouched(node: RoadmapNode, completed: Set<string>): boolean {
  return !subtreeIds(node).some((id) => completed.has(id));
}

export interface Edge {
  parentId: string;
  childId: string;
  /** The segment leading *into* a completed node counts as travelled. */
  completed: boolean;
}

export function collectEdges(nodes: RoadmapNode[], completed: Set<string>): Edge[] {
  const edges: Edge[] = [];

  // The spine: consecutive top-level stages ARE the route through the roadmap.
  // Without these the tree renders as a set of disconnected clusters instead of
  // one continuous path.
  for (let i = 1; i < nodes.length; i += 1) {
    const prev = nodes[i - 1];
    const next = nodes[i];
    if (!prev || !next) continue;
    edges.push({ parentId: prev.id, childId: next.id, completed: completed.has(next.id) });
  }

  // Branches: everything a stage contains hangs off it.
  const visit = (list: RoadmapNode[]): void => {
    for (const node of list) {
      for (const child of node.children) {
        edges.push({
          parentId: node.id,
          childId: child.id,
          completed: completed.has(child.id),
        });
        visit([child]);
      }
    }
  };
  visit(nodes);
  return edges;
}
