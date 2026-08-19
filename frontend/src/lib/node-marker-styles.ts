import { cn } from './utils';
import type { NodeState } from './roadmap-progress';

export const NODE_STATE_LABEL: Record<NodeState, string> = {
  completed: 'Completed',
  current: 'Up next',
  upcoming: 'Not started',
};

/**
 * Shared by the interactive tree and the landing page's static preview, so the
 * two can't drift apart — the preview's whole job is to look like the product.
 *
 * Every state is distinguishable without colour: completed = filled + check,
 * current = filled + pulse ring, upcoming = hollow ring at reduced opacity.
 */
export function markerStateClasses(state: NodeState, size: 'default' | 'sm'): string {
  return cn(
    'relative z-10 grid shrink-0 place-items-center rounded-full border-2 bg-background font-mono font-medium',
    size === 'default' ? 'size-9 text-[0.6875rem]' : 'size-7 text-[0.625rem]',
    state === 'completed' && 'border-secondary bg-secondary text-secondary-foreground',
    state === 'current' && 'animate-waypoint-pulse border-primary bg-primary text-primary-foreground',
    state === 'upcoming' && 'border-muted-foreground/45 text-muted-foreground opacity-50',
  );
}
