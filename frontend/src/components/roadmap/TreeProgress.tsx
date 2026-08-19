import { useAtomValue } from 'jotai';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { progressAtom, progressStatsAtom } from '@/atoms/progressAtom';
import { findCurrentNodeId } from '@/lib/roadmap-progress';
import type { RoadmapContent } from '@/lib/types';

/**
 * Pinned above the tree. The node itself already announces "Up next" inline, so
 * repeating the title here would say the same thing twice — instead this offers
 * the thing you can't do from a label: get back to it after scrolling away.
 */
export function TreeProgress({
  content,
  saving,
}: {
  content: RoadmapContent;
  saving: boolean;
}) {
  const completed = useAtomValue(progressAtom);
  const { completed: done, total, percent } = useAtomValue(progressStatsAtom);
  const currentId = findCurrentNodeId(content.nodes, completed);

  const jumpToCurrent = () => {
    if (!currentId) return;
    const marker = document.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(currentId)}"]`);
    marker?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    marker?.focus({ preventScroll: true });
  };

  return (
    <div className="sticky top-16 z-30 -mx-4 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <span className="font-mono text-sm font-medium tabular-nums">
            {done}
            <span className="text-muted-foreground">/{total}</span>
            <span className="ml-2 text-muted-foreground">{percent}%</span>
          </span>

          <span className="flex items-center gap-2">
            {saving && <span className="type-waypoint text-muted-foreground">Saving</span>}
            {currentId ? (
              <Button variant="ghost" size="sm" onClick={jumpToCurrent}>
                <ArrowDown />
                Up next
              </Button>
            ) : (
              <span className="type-waypoint text-secondary">Path complete</span>
            )}
          </span>
        </div>
        <Progress
          value={percent}
          aria-label={`${percent}% complete`}
          className="h-1.5 bg-muted"
        />
      </div>
    </div>
  );
}
