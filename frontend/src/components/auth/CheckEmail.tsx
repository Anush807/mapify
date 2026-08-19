import { useEffect, useState } from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError, api } from '@/lib/api';

/** Matches the server-side per-account cooldown so the button can't outrun it. */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Shown in place of the signup form after a successful signup — same card, new
 * contents, so it reads as one continuous interaction rather than a new page.
 */
export function CheckEmail({ email }: { email: string }) {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const handle = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(handle);
  }, [secondsLeft]);

  const resend = async () => {
    setSending(true);
    setNotice(null);
    try {
      await api.resendVerification();
      setNotice('Sent. Check your inbox again.');
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setNotice(
        err instanceof ApiError ? err.message : "That didn't send. Try again shortly.",
      );
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        We sent a verification link to{' '}
        <span className="font-medium text-foreground">{email}</span>. It expires in 24 hours.
      </p>

      {notice && (
        <Alert>
          <MailCheck />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={resend}
        disabled={sending || secondsLeft > 0}
      >
        {sending && <Loader2 className="animate-spin" />}
        {secondsLeft > 0 ? `Resend email (${secondsLeft}s)` : 'Resend email'}
      </Button>

      <p className="text-sm text-muted-foreground">
        You can start using Mapify straight away — verifying just secures your account.
      </p>
    </div>
  );
}
