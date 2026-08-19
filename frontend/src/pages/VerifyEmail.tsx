import { useEffect, useRef, useState } from 'react';
import { useSetAtom } from 'jotai';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MailWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthShell } from '@/components/auth/AuthShell';
import { authAtom } from '@/atoms/authAtom';
import { ApiError, api } from '@/lib/api';

type Status = 'checking' | 'verified' | 'invalid';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const setUser = useSetAtom(authAtom);

  const [status, setStatus] = useState<Status>(token ? 'checking' : 'invalid');
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // StrictMode double-invokes effects; the token is single-use, so a second
  // call would report the link as invalid right after it succeeded.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    api
      .verifyEmail(token)
      .then(({ user }) => {
        setStatus('verified');
        // Refresh the session user so the unverified banner disappears.
        setUser((prev) => (prev ? { ...prev, emailVerified: user.emailVerified } : prev));
      })
      .catch(() => setStatus('invalid'));
  }, [token, setUser]);

  const resend = async () => {
    setResending(true);
    setNotice(null);
    try {
      await api.resendVerification();
      setNotice('Sent. Check your inbox.');
    } catch (err) {
      setNotice(
        err instanceof ApiError && err.status === 401
          ? 'Log in first, then request a new link.'
          : err instanceof ApiError
            ? err.message
            : "That didn't send. Try again shortly.",
      );
    } finally {
      setResending(false);
    }
  };

  if (status === 'checking') {
    return (
      <AuthShell title="Verifying your email">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking your link…
        </div>
      </AuthShell>
    );
  }

  if (status === 'verified') {
    return (
      <AuthShell title="Email verified">
        <div className="flex flex-col gap-4">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-secondary" />
            Your address is confirmed and your account is secured.
          </p>
          <Button asChild className="w-full">
            <Link to="/dashboard">Continue to your roadmaps</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="This link has expired">
      <div className="flex flex-col gap-4">
        <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
          <MailWarning className="mt-0.5 size-4 shrink-0" />
          Verification links last 24 hours and work once. Request a new one below.
        </p>

        {notice && (
          <Alert>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}

        <Button variant="outline" className="w-full" onClick={resend} disabled={resending}>
          {resending && <Loader2 className="animate-spin" />}
          Resend verification email
        </Button>

        <Button variant="ghost" asChild className="w-full">
          <Link to="/login">Back to log in</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
