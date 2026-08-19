import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { Loader2, MailWarning, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authAtom, authReadyAtom } from '@/atoms/authAtom';
import { api } from '@/lib/api';

/**
 * The other half of "issue a session immediately" (spec §2): the app stays
 * usable while unverified, and this persists until `emailVerified` is true.
 * Dismissible per session — not stored, so it returns on the next visit.
 */
export function VerifyEmailBanner() {
  const user = useAtomValue(authAtom);
  const ready = useAtomValue(authReadyAtom);
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!ready || !user || user.emailVerified || dismissed) return null;

  const resend = async () => {
    setSending(true);
    try {
      await api.resendVerification();
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-b border-border bg-muted">
      <div className="container flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 text-sm">
        <MailWarning className="size-4 shrink-0 text-primary-strong" aria-hidden />
        <p className="flex-1 text-muted-foreground">
          Verify your email to secure your account.
        </p>

        {sent ? (
          <span className="text-muted-foreground">Sent — check your inbox.</span>
        ) : (
          <Button variant="ghost" size="sm" onClick={resend} disabled={sending}>
            {sending && <Loader2 className="animate-spin" />}
            Resend
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss verification reminder"
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
