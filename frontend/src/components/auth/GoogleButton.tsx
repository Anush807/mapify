import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api';

/** Brand mark stays in its own colours — Google's guidelines require it. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.56Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.75H1.7v2.98A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.67a7.2 7.2 0 0 1 0-4.6V7.1H1.7a12 12 0 0 0 0 10.56l3.85-2.99Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.72 1.2 15.1 0 12 0 7.4 0 3.42 2.64 1.7 6.48l3.85 2.98C6.46 6.77 9 4.75 12 4.75Z"
      />
    </svg>
  );
}

/**
 * A real link, not a fetch: OAuth is a full-page redirect, so the browser has
 * to navigate for the callback to set the session cookie. It targets the API
 * origin directly, which in production is a different host from the app.
 */
export function GoogleButton({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <Button variant="outline" className="w-full" asChild={!disabled} disabled={disabled}>
      {disabled ? (
        <span>
          <GoogleMark />
          {label}
        </span>
      ) : (
        <a href={`${API_BASE_URL}/auth/google`}>
          <GoogleMark />
          {label}
        </a>
      )}
    </Button>
  );
}
