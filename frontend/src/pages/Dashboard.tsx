import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Compass, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { RoadmapCard, statusOf, type RoadmapStatus } from '@/components/RoadmapCard';
import { useLenis } from '@/hooks/useLenis';
import { ApiError, api } from '@/lib/api';
import type { RoadmapSummary } from '@/lib/types';

type Filter = 'all' | RoadmapStatus;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

export function Dashboard() {
  const [roadmaps, setRoadmaps] = useState<RoadmapSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useLenis(roadmaps.length > 6);

  useEffect(() => {
    api
      .listRoadmaps()
      .then(({ roadmaps: list }) => setRoadmaps(list))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Your roadmaps could not be loaded.'),
      )
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () => (filter === 'all' ? roadmaps : roadmaps.filter((r) => statusOf(r) === filter)),
    [roadmaps, filter],
  );

  return (
    <div className="container flex flex-col gap-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold">Your roadmaps</h1>
          <p className="text-sm text-muted-foreground">
            Pick up a path, or start a new one.
          </p>
        </div>
        <Button asChild>
          <Link to="/new">
            <Plus />
            New roadmap
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : roadmaps.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Compass />
            </EmptyMedia>
            <EmptyTitle>No roadmaps yet</EmptyTitle>
            <EmptyDescription>
              Name something you want to learn and Mapify lays out the path.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/new">Generate your first roadmap</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-5">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              {FILTERS.map(({ value, label }) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {visible.length === 0 ? (
            <p className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
              {filter === 'completed'
                ? 'Nothing finished yet. Keep going.'
                : 'Nothing in progress. Open a roadmap to start one.'}
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((roadmap) => (
                <li key={roadmap.id}>
                  <RoadmapCard roadmap={roadmap} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i}>
          <div className="flex h-full flex-col gap-3 rounded-lg border border-l-[3px] p-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </li>
      ))}
    </ul>
  );
}
