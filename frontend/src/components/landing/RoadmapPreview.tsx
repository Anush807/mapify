import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PathConnectors } from '@/components/roadmap/PathConnectors';
import { Reveal } from './Reveal';
import { collectEdges, nodeState, type NodeState } from '@/lib/roadmap-progress';
import { NODE_STATE_LABEL, markerStateClasses } from '@/lib/node-marker-styles';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import type { RoadmapNode } from '@/lib/types';

/** A real roadmap shape, not lorem — the same structure the product generates. */
const PREVIEW_NODES: RoadmapNode[] = [
  {
    id: 'foundations',
    title: 'JavaScript foundations',
    description: 'Closures, array methods, modules, and async/await.',
    children: [
      { id: 'foundations-es6', title: 'Modern syntax', children: [] },
      { id: 'foundations-async', title: 'Promises and async/await', children: [] },
    ],
  },
  {
    id: 'components',
    title: 'Components and props',
    description: 'Build a UI out of small pieces, and pass data down through them.',
    children: [
      { id: 'components-jsx', title: 'JSX and rendering', children: [] },
      { id: 'components-composition', title: 'Composition patterns', children: [] },
    ],
  },
  {
    id: 'state',
    title: 'State and effects',
    description: 'useState, useEffect, and when a component should own its data.',
    children: [
      { id: 'state-hooks', title: 'Core hooks', children: [] },
      { id: 'state-lifting', title: 'Lifting state up', children: [] },
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping a real app',
    description: 'Routing, data fetching, and a production build.',
    children: [{ id: 'shipping-router', title: 'Routing and data', children: [] }],
  },
];

/** Mid-journey, so all three node states are visible at once. */
const COMPLETED = new Set([
  'foundations',
  'foundations-es6',
  'foundations-async',
  'components',
  'components-jsx',
  'components-composition',
]);
const CURRENT_ID = 'state';

export function RoadmapPreview() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [markers] = useState(() => new Map<string, HTMLElement>());
  const [, force] = useState(0);
  const reducedMotion = useReducedMotion();

  const registerMarker = useCallback(
    (id: string, el: HTMLElement | null) => {
      if (el) markers.set(id, el);
      else markers.delete(id);
      force((n) => n + 1);
    },
    [markers],
  );

  // Must be memoised: PathConnectors keys its measure effect on this array's
  // identity, so a fresh one each render re-measures -> re-renders -> loops.
  const edges = useMemo(() => collectEdges(PREVIEW_NODES, COMPLETED), []);

  return (
    <section id="example" className="scroll-mt-20 border-y border-border bg-muted">
      <div className="container py-16 md:py-24">
        <Reveal className="flex flex-col gap-3">
          <h2 className="max-w-2xl text-balance font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
            What a roadmap actually looks like
          </h2>
          <p className="max-w-xl leading-relaxed text-muted-foreground">
            This is “Learn React”, part-way through. Finished steps are filled in, the
            highlighted one is what’s next.
          </p>
        </Reveal>

        <Reveal className="mt-10">
          <Card className="mx-auto max-w-2xl overflow-hidden p-6 sm:p-10">
            {/* Presentational only — the live version is behind sign-in. */}
            <div ref={setContainer} className="relative" aria-hidden="true">
              <PathConnectors
                edges={edges}
                markers={markers}
                container={container}
                reducedMotion={reducedMotion}
              />
              <ol className="relative flex flex-col gap-7">
                {PREVIEW_NODES.map((node, i) => (
                  <PreviewNode
                    key={node.id}
                    node={node}
                    waypoint={i + 1}
                    registerMarker={registerMarker}
                  />
                ))}
              </ol>
            </div>

            {/* The real text equivalent, since the tree above is decorative. */}
            <p className="sr-only">
              Example roadmap for learning React, with four stages: JavaScript foundations
              and Components and props are complete; State and effects is the next step;
              Shipping a real app has not been started.
            </p>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

function PreviewNode({
  node,
  waypoint,
  registerMarker,
}: {
  node: RoadmapNode;
  waypoint: number;
  registerMarker: (id: string, el: HTMLElement | null) => void;
}) {
  const state = nodeState(node.id, COMPLETED, CURRENT_ID);

  return (
    <li className="flex flex-col gap-3">
      <div className="flex items-start gap-4">
        <PreviewMarker
          id={node.id}
          state={state}
          waypoint={waypoint}
          size="default"
          registerMarker={registerMarker}
        />
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              'font-display text-base font-semibold leading-snug sm:text-lg',
              state === 'completed' && 'text-muted-foreground',
            )}
          >
            {node.title}
          </h3>
          {node.description && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {node.description}
            </p>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-3 pl-8">
        {node.children.map((child) => {
          const childState = nodeState(child.id, COMPLETED, CURRENT_ID);
          return (
            <li key={child.id} className="flex items-center gap-4">
              <PreviewMarker
                id={child.id}
                state={childState}
                size="sm"
                registerMarker={registerMarker}
              />
              <span
                className={cn(
                  'text-sm',
                  childState === 'completed' ? 'text-muted-foreground' : 'text-foreground/80',
                )}
              >
                {child.title}
              </span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

function PreviewMarker({
  id,
  state,
  waypoint,
  size,
  registerMarker,
}: {
  id: string;
  state: NodeState;
  waypoint?: number;
  size: 'default' | 'sm';
  registerMarker: (id: string, el: HTMLElement | null) => void;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  // Register from an effect, not an inline ref callback: a callback ref is
  // re-created every render, and registering bumps state, which renders again.
  useEffect(() => {
    registerMarker(id, ref.current);
    return () => registerMarker(id, null);
  }, [id, registerMarker]);

  return (
    <span
      ref={ref}
      className={markerStateClasses(state, size)}
      title={NODE_STATE_LABEL[state]}
    >
      {state === 'completed' ? (
        <Check className="size-4" strokeWidth={3} />
      ) : waypoint !== undefined ? (
        String(waypoint).padStart(2, '0')
      ) : (
        <span className="size-1.5 rounded-full bg-current" />
      )}
    </span>
  );
}
