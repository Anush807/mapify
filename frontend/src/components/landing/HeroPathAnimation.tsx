import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

const VIEW_W = 520;
const VIEW_H = 320;

/** A route that climbs left-to-right, with two gentle bends rather than an arc. */
const PATH_D = 'M 34 268 C 118 268, 116 176, 196 168 S 300 190, 348 128 S 430 72, 486 58';

const DRAW_SECONDS = 1.35;

interface Stop {
  /** Position along the path, 0–1. */
  at: number;
  label: string;
  /** Brand hues alternate so both appear in the first thing a visitor sees. */
  tone: 'primary' | 'secondary';
}

const STOPS: Stop[] = [
  { at: 0.02, label: 'Fundamentals', tone: 'primary' },
  { at: 0.36, label: 'Components', tone: 'secondary' },
  { at: 0.66, label: 'State & data', tone: 'primary' },
  { at: 1, label: 'Shipping it', tone: 'secondary' },
];

interface Placed extends Stop {
  x: number;
  y: number;
}

export function HeroPathAnimation() {
  const pathRef = useRef<SVGPathElement | null>(null);
  const [stops, setStops] = useState<Placed[]>([]);
  const reducedMotion = useReducedMotion();

  // Sample the real geometry so markers sit exactly on the line — hand-placed
  // coordinates drift the moment the curve is edited.
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    setStops(
      STOPS.map((stop) => {
        const point = path.getPointAtLength(length * stop.at);
        return { ...stop, x: point.x, y: point.y };
      }),
    );
  }, []);

  return (
    <div className="relative w-full" aria-hidden="true">
      <div className="relative aspect-[13/8] w-full">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          focusable="false"
          data-hero-animation
        >
          <defs>
            <linearGradient id="hero-path" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))' }} />
              <stop offset="100%" style={{ stopColor: 'hsl(var(--secondary))' }} />
            </linearGradient>
            <filter id="hero-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          {/*
            Idle state: once drawn, the route breathes once every several
            seconds. A repeating re-draw would pull the eye off the headline;
            this only has to prove the hero isn't a static image.
          */}
          {!reducedMotion && (
            <motion.path
              d={PATH_D}
              fill="none"
              stroke="url(#hero-path)"
              strokeWidth={5}
              strokeLinecap="round"
              filter="url(#hero-glow)"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0] }}
              transition={{
                duration: 3.2,
                times: [0, 0.5, 1],
                ease: 'easeInOut',
                repeat: Infinity,
                repeatDelay: 4.5,
                delay: DRAW_SECONDS + 0.8,
              }}
            />
          )}

          {/* The route ahead, always present underneath. */}
          <path
            d={PATH_D}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={2}
            strokeDasharray="6 7"
            strokeLinecap="round"
          />

          {/* The route drawing itself. pathLength normalises the dash units. */}
          <motion.path
            ref={pathRef}
            d={PATH_D}
            fill="none"
            stroke="url(#hero-path)"
            strokeWidth={3.5}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            initial={{ strokeDashoffset: reducedMotion ? 0 : 1 }}
            animate={{ strokeDashoffset: 0 }}
            transition={
              reducedMotion ? { duration: 0 } : { duration: DRAW_SECONDS, ease: 'easeInOut' }
            }
          />

          {stops.map((stop, i) => {
            const isLast = i === stops.length - 1;
            // Each marker lands as the line reaches it, not on a fixed cadence.
            const delay = reducedMotion ? 0 : stop.at * DRAW_SECONDS * 0.94;

            return (
              <motion.g
                key={stop.label}
                initial={{ scale: reducedMotion ? 1 : 0, opacity: reducedMotion ? 1 : 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 520, damping: 20, delay }
                }
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                <circle
                  cx={stop.x}
                  cy={stop.y}
                  r={isLast ? 17 : 12}
                  fill={`hsl(var(--${stop.tone}))`}
                />
                {isLast ? (
                  // The path has to visibly arrive somewhere.
                  <path
                    d={`M ${stop.x - 4.5} ${stop.y + 6} L ${stop.x - 4.5} ${stop.y - 6.5} L ${stop.x + 6} ${stop.y - 3} L ${stop.x - 4.5} ${stop.y + 0.5}`}
                    fill="hsl(var(--secondary-foreground))"
                    stroke="hsl(var(--secondary-foreground))"
                    strokeWidth={1.6}
                    strokeLinejoin="round"
                  />
                ) : (
                  <circle cx={stop.x} cy={stop.y} r={3.5} fill="hsl(var(--background))" />
                )}
              </motion.g>
            );
          })}
        </svg>

        {/* Labels as HTML, so they scale with the type system rather than the viewBox. */}
        {stops.map((stop, i) => {
          const isLast = i === stops.length - 1;
          return (
            <motion.span
              key={stop.label}
              className={cn(
                'absolute hidden whitespace-nowrap text-xs font-medium text-muted-foreground sm:block',
                // The endpoint sits near the right edge, so its label drops
                // below the marker instead of running off the page.
                isLast ? '-translate-x-1/2' : '-translate-y-1/2',
              )}
              style={{
                left: `${(stop.x / VIEW_W) * 100}%`,
                top: `${(stop.y / VIEW_H) * 100}%`,
                marginLeft: isLast ? 0 : 20,
                marginTop: isLast ? 26 : 0,
              }}
              initial={{ opacity: reducedMotion ? 1 : 0, x: reducedMotion ? 0 : -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 0.35, delay: stop.at * DRAW_SECONDS * 0.94 + 0.12 }
              }
            >
              {isLast ? (
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-secondary">
                  You get here
                </span>
              ) : (
                stop.label
              )}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}
