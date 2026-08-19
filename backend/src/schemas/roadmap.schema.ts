import { z } from 'zod';

/**
 * The contract between AI output and storage. Nothing reaches the `content`
 * JSONB column without passing through `RoadmapSchema` first.
 *
 * Every node carries a stable `id` — the frontend uses these both as React keys
 * and as the values stored in `Progress.completedIds`.
 */
export interface RoadmapNode {
  id: string;
  title: string;
  description?: string;
  resources?: string[];
  children: RoadmapNode[];
}

export const RoadmapNodeSchema: z.ZodType<RoadmapNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    resources: z.array(z.string()).optional(),
    children: z.array(RoadmapNodeSchema).optional().default([]),
  }),
);

export const RoadmapSchema = z.object({
  topic: z.string().min(1),
  title: z.string().min(1), // AI-generated display title
  summary: z.string().optional(),
  nodes: z.array(RoadmapNodeSchema).min(1),
});

export type RoadmapContent = z.infer<typeof RoadmapSchema>;

/**
 * Zod's recursive schema validates shape but not size — a pathological response
 * can still be 10k nodes or 40 levels deep. These are enforced in application
 * code after parsing.
 */
export const MAX_DEPTH = 4;
export const MAX_NODES = 150;

export interface TreeStats {
  count: number;
  depth: number;
}

export function collectTreeStats(nodes: RoadmapNode[], depth = 1): TreeStats {
  let count = 0;
  let maxDepth = nodes.length > 0 ? depth : depth - 1;

  for (const node of nodes) {
    count += 1;
    if (node.children.length > 0) {
      const child = collectTreeStats(node.children, depth + 1);
      count += child.count;
      maxDepth = Math.max(maxDepth, child.depth);
    }
  }

  return { count, depth: maxDepth };
}

/** Every node id in the tree, in depth-first order. */
export function collectNodeIds(nodes: RoadmapNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: RoadmapNode[]): void => {
    for (const node of list) {
      ids.push(node.id);
      walk(node.children);
    }
  };
  walk(nodes);
  return ids;
}

/**
 * Post-parse guards that `RoadmapSchema` structurally cannot express:
 * bounded size, bounded depth, and globally unique ids (progress tracking
 * silently breaks if two nodes share an id).
 */
export function validateTreeConstraints(content: RoadmapContent): string[] {
  const problems: string[] = [];
  const { count, depth } = collectTreeStats(content.nodes);

  if (count > MAX_NODES) {
    problems.push(`roadmap has ${count} nodes, maximum is ${MAX_NODES}`);
  }
  if (depth > MAX_DEPTH) {
    problems.push(`roadmap is ${depth} levels deep, maximum is ${MAX_DEPTH}`);
  }

  const ids = collectNodeIds(content.nodes);
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  if (duplicates.size > 0) {
    problems.push(`duplicate node ids: ${[...duplicates].join(', ')}`);
  }

  return problems;
}
