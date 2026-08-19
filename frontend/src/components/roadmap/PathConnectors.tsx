import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { Edge } from '@/lib/roadmap-progress';

export interface Point {
  x: number;
  y: number;
}

interface PathConnectorsProps {
  edges: Edge[];
  /** Live map of node id -> marker element, filled by the nodes as they mount. */
  markers: Map<string, HTMLElement>;
  container: HTMLElement | null;
  reducedMotion: boolean;
}

interface Segment {
  key: string;
  d: string;
  completed: boolean;
}

/** Marker centre in container-space, ignoring page scroll. */
function centerOf(el: HTMLElement, container: HTMLElement): Point {
  const a = el.getBoundingClientRect();
  const b = container.getBoundingClientRect();
  return {
    x: a.left - b.left + a.width / 2,
    y: a.top - b.top + a.height / 2,
  };
}

/**
 * The curve descends along the parent's own column and only sweeps sideways at
 * the very end, arriving horizontally into the child.
 *
 * Both control points sit on the parent's x. A symmetric S-curve (control
 * points split between the two x positions) sends every child a long diagonal,
 * so sibling lines cross each other and cut across the description text. This
 * shape keeps a single clean trunk with short branches off it — and when parent
 * and child share an x, it degenerates to a straight vertical spine.
 */
function bezier(from: Point, to: Point): string {
  const dy = Math.max(to.y - from.y, 1);
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + dy * 0.5}, ${from.x} ${to.y}, ${to.x} ${to.y}`;
}

export function PathConnectors({
  edges,
  markers,
  container,
  reducedMotion,
}: PathConnectorsProps) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Re-measure whenever the edge set changes identity (expand/collapse, data).
  const edgeKey = useMemo(
    () => edges.map((e) => `${e.parentId}>${e.childId}:${e.completed ? 1 : 0}`).join('|'),
    [edges],
  );

  useLayoutEffect(() => {
    if (!container) return;

    const measure = () => {
      const next: Segment[] = [];
      for (const edge of edges) {
        const parent = markers.get(edge.parentId);
        const child = markers.get(edge.childId);
        // A collapsed branch has no mounted child marker — skip its edge.
        if (!parent || !child) continue;
        next.push({
          key: `${edge.parentId}>${edge.childId}`,
          d: bezier(centerOf(parent, container), centerOf(child, container)),
          completed: edge.completed,
        });
      }
      setSegments(next);
      setSize({ width: container.offsetWidth, height: container.offsetHeight });
    };

    measure();

    // The container's box changes on every frame of a collapse animation and on
    // any reflow, so observing it covers expand/collapse, resize, and font load.
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    for (const el of markers.values()) observer.observe(el);

    return () => observer.disconnect();
  }, [container, edges, markers, edgeKey]);

  // Webfonts land after first paint and shift every marker.
  useEffect(() => {
    if (!container || !('fonts' in document)) return;
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) setSize((s) => ({ ...s }));
    });
    return () => {
      cancelled = true;
    };
  }, [container]);

  if (!container || segments.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={size.width}
      height={size.height}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/*
          userSpaceOnUse, spanning the full tree height — not per-segment. With
          the default objectBoundingBox each segment would restart the ramp and
          every line would look the same colour. Across the whole path, early
          stages read orange (forward motion) and deepen into red-violet
          (depth/completed) the further along you get.
        */}
        <linearGradient
          id="mapify-path-travelled"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2={Math.max(size.height, 1)}
        >
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))' }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--secondary))' }} />
        </linearGradient>
      </defs>

      {segments.map((segment) => (
        <g key={segment.key}>
          {/* Untravelled: thin and dashed, always beneath. */}
          <path
            d={segment.d}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
          {/*
            Travelled: the same curve drawn on top. pathLength="1" normalises the
            dash units so one transition works for every segment length — the
            gradient sweeps along the line as it completes.
          */}
          <path
            d={segment.d}
            fill="none"
            stroke="url(#mapify-path-travelled)"
            strokeWidth={2}
            strokeLinecap="round"
            pathLength={1}
            style={{
              // Set as inline style, not presentation attributes: the CSS
              // transition below must act on the same declaration that changes.
              strokeDasharray: 1,
              strokeDashoffset: segment.completed ? 0 : 1,
              transition: reducedMotion
                ? 'none'
                : 'stroke-dashoffset 620ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </g>
      ))}
    </svg>
  );
}
