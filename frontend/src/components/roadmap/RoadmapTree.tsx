import { useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TreeNode } from './TreeNode';
import { PathConnectors } from './PathConnectors';
import { progressAtom } from '@/atoms/progressAtom';
import { collectEdges, findCurrentNodeId } from '@/lib/roadmap-progress';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { RoadmapContent } from '@/lib/types';

/**
 * The signature element. Nodes are laid out in the DOM (so text wraps and
 * collapses naturally), then the connecting curves are drawn as one SVG overlay
 * measured from the live marker positions — a pure-SVG layout couldn't reflow
 * variable-length titles.
 */
export function RoadmapTree({ content }: { content: RoadmapContent }) {
  const completed = useAtomValue(progressAtom);
  const reducedMotion = useReducedMotion();

  const [container, setContainer] = useState<HTMLElement | null>(null);
  // useState (not useRef) for the stable identity: a ref's `.current` must not
  // be read during render, and this Map is passed down as a prop.
  const [markers] = useState(() => new Map<string, HTMLElement>());
  const [, forceMeasure] = useState(0);

  const registerMarker = useCallback(
    (id: string, el: HTMLElement | null) => {
      if (el) markers.set(id, el);
      else markers.delete(id);
      // A mount/unmount changes which edges are drawable.
      forceMeasure((n) => n + 1);
    },
    [markers],
  );

  const currentId = useMemo(
    () => findCurrentNodeId(content.nodes, completed),
    [content.nodes, completed],
  );

  const edges = useMemo(
    () => collectEdges(content.nodes, completed),
    [content.nodes, completed],
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div ref={setContainer} className="relative">
        <PathConnectors
          edges={edges}
          markers={markers}
          container={container}
          reducedMotion={reducedMotion}
        />

        {/*
          Only the top level is numbered. The stages are a real sequence — the
          route through the roadmap — while a stage's contents are a set of
          things to learn, not steps 01/02/03.
        */}
        <ol className="relative flex flex-col gap-8">
          {content.nodes.map((node, i) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              waypoint={i + 1}
              currentId={currentId}
              registerMarker={registerMarker}
            />
          ))}
        </ol>
      </div>
    </TooltipProvider>
  );
}
