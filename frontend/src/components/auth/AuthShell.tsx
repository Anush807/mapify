import { Link } from 'react-router-dom';
import { Route as RouteIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * One layout for every auth screen, so login and signup aren't two different
 * designs. The only personality is the resting path motif below — the landing
 * page's animation frozen, not a second animation.
 */
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-10">
      <Link
        to="/"
        className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <RouteIcon className="size-5 text-primary" />
        <span className="font-display text-lg font-bold tracking-[-0.02em]">Mapify</span>
      </Link>

      <Card className="w-full max-w-[420px]">
        <CardHeader className="gap-1.5">
          <RestingPath />
          <CardTitle className="font-display text-xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

/**
 * The path motif at rest: three travelled waypoints and one still ahead.
 * Static by design — auth pages are a means to an end, not a place to spend
 * animation budget.
 */
function RestingPath() {
  return (
    <svg
      viewBox="0 0 132 20"
      className="mb-2 h-5 w-[132px] overflow-visible"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M 6 14 C 26 14, 30 6, 48 6 S 74 14, 90 10"
        fill="none"
        stroke="hsl(var(--secondary))"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M 90 10 L 126 10"
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        strokeLinecap="round"
      />
      <circle cx={6} cy={14} r={4} fill="hsl(var(--secondary))" />
      <circle cx={48} cy={6} r={4} fill="hsl(var(--secondary))" />
      <circle cx={90} cy={10} r={5} fill="hsl(var(--primary))" />
      <circle cx={126} cy={10} r={3.5} fill="none" stroke="hsl(var(--border))" strokeWidth={2} />
    </svg>
  );
}
