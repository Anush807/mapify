import { useAtomValue } from 'jotai';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authAtom, authReadyAtom } from '@/atoms/authAtom';

export function RequireAuth() {
  const user = useAtomValue(authAtom);
  const ready = useAtomValue(authReadyAtom);
  const location = useLocation();

  // Wait for the session check — redirecting first would bounce logged-in
  // users to /login on every hard refresh.
  if (!ready) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <Outlet />;
}
