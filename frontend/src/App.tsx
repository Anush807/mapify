import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { RequireAuth } from '@/components/RequireAuth';
import { Landing } from '@/pages/Landing';
import { Home } from '@/pages/Home';
import { Dashboard } from '@/pages/Dashboard';
import { RoadmapPage } from '@/pages/RoadmapPage';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { VerifyEmail } from '@/pages/VerifyEmail';
import { authAtom, authReadyAtom } from '@/atoms/authAtom';
import { api } from '@/lib/api';

/** Remounts RoadmapPage on id change so it reloads from a clean state. */
function RoadmapRoute() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/dashboard" replace />;
  return <RoadmapPage key={id} id={id} />;
}

export default function App() {
  const setUser = useSetAtom(authAtom);
  const setReady = useSetAtom(authReadyAtom);

  // The JWT lives in an httpOnly cookie, so the only way to know who's logged
  // in is to ask the server once on boot.
  useEffect(() => {
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, [setUser, setReady]);

  return (
    <Routes>
      {/* The landing page brings its own nav and footer, so it sits outside Layout. */}
      <Route index element={<Landing />} />

      {/* Auth screens are a centered card on their own — no app chrome. */}
      <Route path="login" element={<Login />} />
      <Route path="signup" element={<Signup />} />
      <Route path="verify-email" element={<VerifyEmail />} />

      <Route element={<Layout />}>
        <Route path="new" element={<Home />} />

        <Route element={<RequireAuth />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="roadmap/:id" element={<RoadmapRoute />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
