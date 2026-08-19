import { Link } from 'react-router-dom';
import { Route as RouteIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <RouteIcon className="size-4 text-primary" />
          <span className="font-display text-sm font-bold tracking-[-0.02em]">Mapify</span>
        </Link>

        <nav className="flex items-center gap-3 text-sm text-muted-foreground">
          <a
            href="#example"
            className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Example
          </a>
          <Separator orientation="vertical" className="h-4" />
          <Link
            to="/login"
            className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
