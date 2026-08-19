import { useAtom, useAtomValue } from 'jotai';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Route as RouteIcon, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { authAtom, authReadyAtom } from '@/atoms/authAtom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export function Layout() {
  const [user, setUser] = useAtom(authAtom);
  const ready = useAtomValue(authReadyAtom);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link
            to={user ? '/dashboard' : '/'}
            className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <RouteIcon className="size-5 text-primary" />
            <span className="font-display text-lg font-bold tracking-[-0.02em]">Mapify</span>
          </Link>

          <nav className="flex items-center gap-1">
            {ready && user ? (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      isActive && 'bg-accent text-accent-foreground',
                    )
                  }
                >
                  Roadmaps
                </NavLink>
                <ThemeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Account menu">
                      <UserIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <span className="block text-sm font-medium">{user.name ?? 'Signed in'}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onSelect={handleLogout}>
                        <LogOut />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : ready ? (
              <>
                <ThemeToggle />
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/signup">Sign up</Link>
                </Button>
              </>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
