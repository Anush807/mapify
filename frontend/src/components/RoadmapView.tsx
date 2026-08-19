import { useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { RoadmapTree } from '@/components/roadmap/RoadmapTree';
import { TreeProgress } from '@/components/roadmap/TreeProgress';
import { progressAtom } from '@/atoms/progressAtom';
import { useLenis } from '@/hooks/useLenis';
import { api } from '@/lib/api';
import type { Roadmap } from '@/lib/types';

const SAVE_DEBOUNCE_MS = 500;

export function RoadmapView({ roadmap }: { roadmap: Roadmap }) {
  const completed = useAtomValue(progressAtom);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Trees get tall; this is exactly the scroll-driven progression Lenis suits.
  useLenis();

  // Skip the write that seeding the atom on mount would otherwise trigger.
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    // One request per burst of clicks, not one per click.
    const handle = setTimeout(() => {
      setSaving(true);
      api
        .updateProgress(roadmap.id, [...completed])
        .then(() => setSaveError(null))
        .catch(() => setSaveError('Progress could not be saved. It will retry on your next change.'))
        .finally(() => setSaving(false));
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [completed, roadmap.id]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="type-waypoint text-primary-strong">{roadmap.topic}</p>
        <h1 className="max-w-3xl text-balance font-display text-3xl font-bold leading-[1.1] sm:text-4xl">
          {roadmap.content.title}
        </h1>
        {roadmap.content.summary && (
          <p className="max-w-2xl leading-relaxed text-muted-foreground">
            {roadmap.content.summary}
          </p>
        )}
      </header>

      <TreeProgress content={roadmap.content} saving={saving} />

      {saveError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <RoadmapTree content={roadmap.content} />
    </div>
  );
}
