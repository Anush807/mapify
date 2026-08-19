import { forwardRef } from 'react';
import { Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { NodeState } from '@/lib/roadmap-progress';

const STATE_LABEL: Record<NodeState, string> = {
  completed: 'Completed',
  current: 'Up next',
  upcoming: 'Not started',
};

interface NodeMarkerProps {
  nodeId: string;
  state: NodeState;
  title: string;
  onToggle: () => void;
  /** Top-level stages sit on a real sequence, so they carry a waypoint number. */
  waypoint?: number;
  size?: 'default' | 'sm';
}

/**
 * The state marker doubles as the check control. Every state is distinguishable
 * without colour: completed = filled + check glyph, current = filled + pulse
 * ring + number, upcoming = hollow ring at reduced opacity.
 */
export const NodeMarker = forwardRef<HTMLButtonElement, NodeMarkerProps>(
  ({ nodeId, state, title, onToggle, waypoint, size = 'default' }, ref) => {
    const isCompleted = state === 'completed';
    const isCurrent = state === 'current';

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={ref}
            type="button"
            data-node-id={nodeId}
            onClick={onToggle}
            aria-pressed={isCompleted}
            aria-label={`${STATE_LABEL[state]}: ${title}. ${
              isCompleted ? 'Mark as not done' : 'Mark as done'
            }`}
            className={cn(
              'relative z-10 grid shrink-0 place-items-center rounded-full border-2 bg-background font-mono font-medium transition-[transform,background-color,border-color] duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'hover:scale-[1.08]',
              size === 'default' ? 'size-9 text-[0.6875rem]' : 'size-7 text-[0.625rem]',
              isCompleted && 'border-secondary bg-secondary text-secondary-foreground',
              isCurrent &&
                'animate-waypoint-pulse border-primary bg-primary text-primary-foreground',
              state === 'upcoming' &&
                'border-muted-foreground/45 text-muted-foreground opacity-50',
            )}
          >
            {isCompleted ? (
              <Check className="size-4" strokeWidth={3} aria-hidden />
            ) : waypoint !== undefined ? (
              String(waypoint).padStart(2, '0')
            ) : (
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">{STATE_LABEL[state]}</TooltipContent>
      </Tooltip>
    );
  },
);
NodeMarker.displayName = 'NodeMarker';
