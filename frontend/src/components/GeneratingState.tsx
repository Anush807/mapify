import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Generation takes several seconds. A bare spinner reads as a hang, so narrate
 * what's actually happening — these mirror the real backend stages.
 */
const STAGES = [
  'Sending your topic to the model…',
  'Drafting the stages of your path…',
  'Checking the structure is valid…',
  'Almost there — putting it together…',
];

export function GeneratingState({ topic }: { topic: string }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const handle = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 2500);
    return () => clearInterval(handle);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-card/50 px-6 py-14 text-center">
      <Loader2 className="size-7 animate-spin text-primary" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">
          Building your roadmap for <span className="text-primary-strong">{topic}</span>
        </p>
        <p key={stage} className="animate-fade-in text-sm text-muted-foreground">
          {STAGES[stage]}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">This usually takes 5–20 seconds.</p>
    </div>
  );
}
