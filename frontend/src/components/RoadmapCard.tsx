import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { RoadmapSummary } from '@/lib/types';

export type RoadmapStatus = 'new' | 'in-progress' | 'completed';

export function statusOf(roadmap: RoadmapSummary): RoadmapStatus {
  if (roadmap.totalNodes > 0 && roadmap.completedCount >= roadmap.totalNodes) return 'completed';
  return roadmap.completedCount > 0 ? 'in-progress' : 'new';
}

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

/**
 * The three states are weighted differently on purpose: a finished path, one
 * underway, and one never opened should not be scannable as the same object.
 */
export function RoadmapCard({ roadmap }: { roadmap: RoadmapSummary }) {
  const status = statusOf(roadmap);
  const percent =
    roadmap.totalNodes === 0
      ? 0
      : Math.round((roadmap.completedCount / roadmap.totalNodes) * 100);

  return (
    <Link
      to={`/roadmap/${roadmap.id}`}
      className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card
        className={cn(
          'h-full border-l-[3px] transition-[transform,box-shadow,border-color] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md',
          status === 'in-progress' && 'border-l-primary',
          status === 'completed' && 'border-l-secondary',
          status === 'new' && 'border-l-border group-hover:border-l-primary/40',
        )}
      >
        <CardHeader className="gap-1.5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <p className="type-waypoint truncate text-muted-foreground">{roadmap.topic}</p>
            {status === 'completed' && (
              <Badge className="shrink-0 bg-secondary text-secondary-foreground hover:bg-secondary">
                Completed
              </Badge>
            )}
          </div>
          <CardTitle className="font-display text-base leading-snug">{roadmap.title}</CardTitle>
        </CardHeader>

        {status !== 'in-progress' ? (
          /*
           * A bar only earns its place mid-journey. At 0% it says nothing, and
           * at 100% an orange "in motion" fill contradicts the violet
           * completed badge sitting right above it.
           */
          <CardFooter className="pt-0">
            <p className="font-mono text-xs text-muted-foreground">
              {status === 'completed'
                ? `${roadmap.totalNodes}/${roadmap.totalNodes} steps`
                : `${roadmap.totalNodes} steps · added ${dateFormat.format(new Date(roadmap.createdAt))}`}
            </p>
          </CardFooter>
        ) : (
          <CardContent className="flex flex-col gap-2">
            <Progress value={percent} aria-label={`${percent}% complete`} className="h-1.5 bg-muted" />
            <div className="flex items-baseline justify-between font-mono text-xs text-muted-foreground">
              <span>
                {roadmap.completedCount}/{roadmap.totalNodes} steps
              </span>
              <span className="tabular-nums text-foreground">{percent}%</span>
            </div>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
