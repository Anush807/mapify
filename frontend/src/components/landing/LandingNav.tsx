import { Link } from 'react-router-dom';
import { Route as RouteIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <RouteIcon className="size-5 text-primary" />
          <span className="font-display text-lg font-bold tracking-[-0.02em]">Mapify</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/signup">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
