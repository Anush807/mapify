import { useEffect, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RoadmapView } from '@/components/RoadmapView';
import { currentRoadmapAtom } from '@/atoms/currentRoadmapAtom';
import { progressAtom } from '@/atoms/progressAtom';
import { ApiError, api } from '@/lib/api';

interface RoadmapPageProps {
  id: string;
}

/**
 * Mounted with `key={id}` so a route change remounts rather than resetting
 * state inside an effect.
 */
export function RoadmapPage({ id }: RoadmapPageProps) {
  const [roadmap, setRoadmap] = useAtom(currentRoadmapAtom);
  const setProgress = useSetAtom(progressAtom);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Always refetch: the atom may hold a different roadmap, or stale progress
    // from another tab.
    api
      .getRoadmap(id)
      .then(({ roadmap: fetched }) => {
        if (cancelled) return;
        setRoadmap(fetched);
        setProgress(new Set(fetched.completedIds));
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load this roadmap.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, setRoadmap, setProgress]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this roadmap? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.deleteRoadmap(id);
      setRoadmap(null);
      setProgress(new Set());
      navigate('/dashboard', { replace: true });
    } catch {
      setError("Couldn't delete this roadmap.");
      setDeleting(false);
    }
  };

  if (loading) return <RoadmapSkeleton />;

  if (error || !roadmap) {
    return (
      <div className="container flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-muted-foreground">{error ?? 'That roadmap is no longer here.'}</p>
        <Button variant="outline" asChild>
          <Link to="/dashboard">Back to your roadmaps</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft />
            Your roadmaps
          </Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}>
          <Trash2 className="text-destructive" />
          <span className="sr-only sm:not-sr-only">Delete</span>
        </Button>
      </div>

      <RoadmapView roadmap={roadmap} />
    </div>
  );
}

function RoadmapSkeleton() {
  return (
    <div className="container flex max-w-3xl flex-col gap-6 py-8">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-2 w-full" />
      <div className="flex flex-col gap-8 pt-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
