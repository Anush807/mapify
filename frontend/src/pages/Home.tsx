import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { TopicInput } from '@/components/TopicInput';
import { GeneratingState } from '@/components/GeneratingState';
import { Button } from '@/components/ui/button';
import { authAtom, authReadyAtom } from '@/atoms/authAtom';
import { currentRoadmapAtom } from '@/atoms/currentRoadmapAtom';
import { progressAtom } from '@/atoms/progressAtom';
import { ApiError, api } from '@/lib/api';

export function Home() {
  const user = useAtomValue(authAtom);
  const ready = useAtomValue(authReadyAtom);
  const setRoadmap = useSetAtom(currentRoadmapAtom);
  const setProgress = useSetAtom(progressAtom);
  const navigate = useNavigate();

  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);

  const generate = async (nextTopic: string) => {
    setTopic(nextTopic);
    setLoading(true);
    setError(null);

    try {
      const { roadmap } = await api.createRoadmap(nextTopic);
      setRoadmap(roadmap);
      setProgress(new Set(roadmap.completedIds));
      navigate(`/roadmap/${roadmap.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login', { state: { from: '/new' } });
        return;
      }
      setError({
        message:
          err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
        // A 422 means this topic didn't work — reword it. Anything else is
        // worth retrying as-is.
        retryable: !(err instanceof ApiError && err.isUnprocessable),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex max-w-2xl flex-col gap-8 py-16">
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-balance font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
          Turn any topic into a path you can follow
        </h1>
        <p className="text-muted-foreground">
          Describe what you want to learn. Mapify builds a staged roadmap you can check off as
          you go.
        </p>
      </div>

      {loading ? (
        <GeneratingState topic={topic} />
      ) : (
        <>
          <TopicInput onSubmit={generate} loading={loading} disabled={ready && !user} />

          {ready && !user && (
            <p className="rounded-md border bg-card px-4 py-3 text-center text-sm text-muted-foreground">
              <Link to="/signup" className="font-medium text-primary-strong hover:underline">
                Create an account
              </Link>{' '}
              or{' '}
              <Link to="/login" className="font-medium text-primary-strong hover:underline">
                log in
              </Link>{' '}
              to generate and save roadmaps.
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-sm text-destructive">{error.message}</p>
                {error.retryable && topic && (
                  <Button size="sm" variant="outline" onClick={() => generate(topic)}>
                    <RefreshCw />
                    Try again
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
