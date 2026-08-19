import { useCallback, useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { ChevronRight, BookOpen, ExternalLink } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { NodeMarker } from './NodeMarker';
import { progressAtom } from '@/atoms/progressAtom';
import {
  isSubtreeUntouched,
  nodeState,
  subtreeIds,
  type NodeState,
} from '@/lib/roadmap-progress';
import { cn } from '@/lib/utils';
import type { RoadmapNode } from '@/lib/types';

interface TreeNodeProps {
  node: RoadmapNode;
  depth: number;
  currentId: string | null;
  registerMarker: (id: string, el: HTMLElement | null) => void;
  /** Only top-level stages are numbered — see the sequence note in RoadmapTree. */
  waypoint?: number;
}

export function TreeNode({
  node,
  depth,
  currentId,
  registerMarker,
  waypoint,
}: TreeNodeProps) {
  const [completed, setCompleted] = useAtom(progressAtom);
  const markerRef = useRef<HTMLButtonElement | null>(null);

  const state: NodeState = nodeState(node.id, completed, currentId);
  const hasChildren = node.children.length > 0;
  const hasDetail = Boolean(node.description) || (node.resources?.length ?? 0) > 0;

  // An untouched branch starts folded so a 150-node roadmap doesn't open as a
  // wall; anything already in progress stays open.
  const [open, setOpen] = useState(
    () => depth === 0 || !isSubtreeUntouched(node, completed),
  );

  // The branch containing "up next" opens itself, so what to do next is never
  // hidden behind a fold.
  useEffect(() => {
    if (!currentId || !subtreeIds(node).includes(currentId)) return;
    // Returning the same value lets React bail out instead of re-rendering
    // every already-open branch each time progress changes.
    setOpen((prev) => (prev ? prev : true));
  }, [currentId, node]);

  useEffect(() => {
    registerMarker(node.id, markerRef.current);
    return () => registerMarker(node.id, null);
  }, [node.id, registerMarker]);

  /** Checking a stage checks everything inside it — a ticked parent above
   *  unticked children reads as a bug, not a shortcut. */
  const toggle = useCallback(() => {
    setCompleted((prev) => {
      const next = new Set(prev);
      const ids = subtreeIds(node);
      const turningOn = !prev.has(node.id);
      for (const id of ids) {
        if (turningOn) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, [node, setCompleted]);

  const isStage = depth === 0;

  return (
    <li className={cn('relative', isStage ? 'pl-0' : 'pl-8')}>
      <div className="flex items-start gap-4">
        <NodeMarker
          ref={markerRef}
          nodeId={node.id}
          state={state}
          title={node.title}
          onToggle={toggle}
          size={isStage ? 'default' : 'sm'}
          {...(waypoint !== undefined ? { waypoint } : {})}
        />

        <div className="min-w-0 flex-1 pb-1">
          <Collapsible open={open} onOpenChange={setOpen}>
            <div className="flex items-start justify-between gap-2">
              {hasDetail || hasChildren ? (
                <CollapsibleTrigger
                  className={cn(
                    'group -ml-1 flex min-w-0 flex-1 items-start gap-1.5 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-accent/60',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  )}
                >
                  <ChevronRight
                    className={cn(
                      'mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                      open && 'rotate-90',
                    )}
                    aria-hidden
                  />
                  <NodeTitle node={node} state={state} isStage={isStage} />
                </CollapsibleTrigger>
              ) : (
                <div className="px-1 py-0.5">
                  <NodeTitle node={node} state={state} isStage={isStage} />
                </div>
              )}

              {isStage && hasChildren && (
                <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-[0.625rem]">
                  {node.children.filter((c) => completed.has(c.id)).length}/{node.children.length}
                </Badge>
              )}
            </div>

            <CollapsibleContent
              className={cn(
                'overflow-hidden',
                'data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up',
              )}
            >
              <div className="flex flex-col gap-3 pl-6 pt-2">
                {node.description && (
                  <p
                    className={cn(
                      'max-w-prose text-sm leading-relaxed text-muted-foreground',
                      state === 'upcoming' && 'opacity-80',
                    )}
                  >
                    {node.description}
                  </p>
                )}

                {node.resources && node.resources.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {node.resources.map((resource) => (
                      <li key={resource}>
                        <ResourceLink resource={resource} />
                      </li>
                    ))}
                  </ul>
                )}

                {hasChildren && (
                  <ul className="relative flex flex-col gap-4 pt-1">
                    {node.children.map((child) => (
                      <TreeNode
                        key={child.id}
                        node={child}
                        depth={depth + 1}
                        currentId={currentId}
                        registerMarker={registerMarker}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </li>
  );
}

function NodeTitle({
  node,
  state,
  isStage,
}: {
  node: RoadmapNode;
  state: NodeState;
  isStage: boolean;
}) {
  return (
    <span className="min-w-0">
      <span
        className={cn(
          'block leading-snug',
          isStage ? 'font-display text-lg font-semibold' : 'text-sm font-medium',
          state === 'completed' && 'text-muted-foreground',
          state === 'upcoming' && 'text-foreground/70',
        )}
      >
        {node.title}
      </span>
      {state === 'current' && (
        <span className="type-waypoint mt-1 block text-primary-strong">Up next</span>
      )}
    </span>
  );
}

function ResourceLink({ resource }: { resource: string }) {
  const isUrl = /^https?:\/\//i.test(resource);

  if (!isUrl) {
    return (
      <span className="flex items-start gap-2 text-xs text-muted-foreground">
        <BookOpen className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {resource}
      </span>
    );
  }

  return (
    <a
      href={resource}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-start gap-2 rounded-sm text-xs text-primary-strong underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{resource}</span>
    </a>
  );
}
