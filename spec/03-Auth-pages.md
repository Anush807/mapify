# Mapify — Authentication Pages Spec

Scope: **login page, signup page, Google OAuth flow, and email verification
flow.** Not the dashboard, not the landing page (separate specs) — but this
spec should visually match both, reusing the same design tokens and shadcn
setup already established.

Before building, consult `.claude/skills/frontend-design.md` and the shadcn
skill, same as prior specs. This spec covers structure and flow logic in
more detail than visual direction, since auth pages are function-first —
don't over-design them; consistency with the rest of the app matters more
than a signature moment here.

---

## 1. Design Direction

Auth pages are a means to an end — the visitor wants to get through them
fast. Keep it simple: centered card, minimal copy, no marketing content, no
competing CTAs. The one place to spend any personality is a small, static
brand touch (e.g. the Mapify logo + a subtle node/path graphic near it) —
not a new animation, reuse something visually related to the landing page's
path motif at rest, not in motion.

Support both light and dark mode here (unlike the landing page) — auth
pages sit behind the same theme toggle state as the dashboard, so a user who
switched to dark mode shouldn't hit a light-only login screen. Reuse the
existing token set from the dashboard spec exactly — no new colors.

Layout: single centered `Card` (shadcn), max-width ~400–440px, vertically
centered on the viewport. No split-screen illustration panel — keep it
simple and consistent between login and signup rather than designing two
different layouts.

---

## 2. Page Structure

### Login (`/login`)

```
┌───────────────────────────┐
│      [Mapify logo]         │
│      Welcome back          │
│                             │
│  [Continue with Google]    │
│  ── or ──                  │
│  Email      [___________]  │
│  Password   [___________]  │
│  [Log in]                  │
│                             │
│  Don't have an account?     │
│  Sign up                    │
└───────────────────────────┘
```

### Signup (`/signup`)

```
┌───────────────────────────┐
│      [Mapify logo]         │
│      Create your account   │
│                             │
│  [Continue with Google]    │
│  ── or ──                  │
│  Email            [______] │
│  Password         [______] │
│  Confirm password [______] │
│  [Create account]          │
│                             │
│  Already have an account?   │
│  Log in                     │
└───────────────────────────┘
```

Exactly 3 fields on signup as specified: email, password, confirm password.
No name field, no username — keep signup friction low; a display name can be
collected later in onboarding/settings if needed, not here.

### Post-signup state (non-OAuth only)

After a successful email/password signup, **don't** silently redirect to the
dashboard. Show an inline state change within the same card:

```
┌───────────────────────────┐
│      [Mapify logo]         │
│      Check your email      │
│                             │
│  We sent a verification    │
│  link to you@email.com     │
│                             │
│  [Resend email]  (disabled │
│   60s after send, then     │
│   re-enabled)               │
└───────────────────────────┘
```

**Assumption to flag:** this spec does *not* block login before
verification — the user is issued a session immediately after signup (see
Section 4) so they can start using the app, with a persistent but dismissible
banner elsewhere in the app ("Verify your email to secure your account —
Resend") until `emailVerified` is true. If you'd rather hard-block unverified
users from the dashboard entirely, flag it and this flow changes to
redirect-to-check-your-email-page instead of issuing a session — say the
word and I'll rewrite this section.

### Email verification landing (`/verify-email?token=...`)

A minimal page (not really a "form" page) that the verification link opens
to. On mount, calls the backend to validate the token, then shows one of:
- Success: "Email verified" + button to continue to dashboard
- Expired/invalid token: "This link has expired" + "Resend verification email" button

---

## 3. Data Model Changes

Extend the `User` model from the implementation spec. `passwordHash` becomes
optional since Google-only users won't have one.

```prisma
model User {
  id                        String    @id @default(cuid())
  email                     String    @unique
  passwordHash              String?   // null for Google-only accounts
  googleId                  String?   @unique
  name                      String?
  emailVerified              Boolean   @default(false)
  emailVerificationToken     String?   @unique
  emailVerificationExpires   DateTime?
  createdAt                 DateTime  @default(now())
  roadmaps                  Roadmap[]
  progress                  Progress[]
}
```

Store a hashed version of the verification token (same pattern as password —
hash before storing, compare hash on verification) rather than the raw token,
so a DB leak doesn't hand out working verification links.

---

## 4. Backend Flow

### Email/password signup

```
POST /api/auth/signup   { email, password, confirmPassword }
```
1. Validate via Zod: valid email, password meets minimum policy (e.g. 8+
   chars — confirm your actual policy before implementing), `password ===
   confirmPassword`
2. Check email not already registered → 409 if it is, with a message that
   doesn't reveal whether it was a Google or password account (just "an
   account with this email already exists")
3. Hash password (bcrypt), create `User` with `emailVerified: false`
4. Generate a random token (`crypto.randomBytes(32).toString('hex')`), store
   its hash + a 24h expiry on the user
5. Send verification email (Section 6) with a link:
   `${FRONTEND_URL}/verify-email?token=${rawToken}`
6. Issue JWT + set httpOnly cookie (per the assumption in Section 2), return
   user object with `emailVerified: false` so the frontend knows to show the
   "check your email" state

### Email/password login

```
POST /api/auth/login   { email, password }
```
1. Look up user by email. If `passwordHash` is null (Google-only account),
   return a specific error: "This email is registered with Google — continue
   with Google instead" rather than a generic invalid-credentials message
2. Verify bcrypt hash, issue JWT + cookie on success

### Google OAuth

Use `passport` + `passport-google-oauth20`, stateless (`session: false`) —
issue your own JWT after the callback rather than relying on Passport
sessions, to stay consistent with the existing JWT-cookie approach.

```
GET  /api/auth/google            -> passport.authenticate('google', { scope: ['profile','email'] })
GET  /api/auth/google/callback   -> passport.authenticate('google', { session: false }),
                                     then: find-or-create user, issue JWT, redirect to FRONTEND_URL/dashboard
```

Find-or-create logic in the callback handler:
1. Look up `User` by `googleId`. If found, log them in.
2. If not found, look up by email (from Google profile). If a
   password-based account with that email already exists, **link** the
   Google account to it (set `googleId` on the existing user) rather than
   creating a duplicate — and mark `emailVerified: true` since Google
   already verified the email.
3. If no user exists at all, create one: `googleId`, `email`, `name` from
   the Google profile, `passwordHash: null`, `emailVerified: true`
   immediately — no verification email needed for Google signups, per your
   requirement.

### Email verification

```
GET  /api/auth/verify-email?token=...
```
1. Hash the incoming token, look up a user with a matching
   `emailVerificationToken` hash and `emailVerificationExpires > now`
2. If valid: set `emailVerified: true`, clear the token fields, respond
   success
3. If invalid/expired: respond so frontend can show the expired state and
   offer resend

```
POST /api/auth/resend-verification   (requires auth, or { email } if not authenticated at that point)
```
Regenerates token + expiry, resends email. Rate-limit this (e.g. one send
per 60s per account) both server-side and reflected in the frontend's
disabled-button countdown.

---

## 5. Frontend Flow

- `Login.tsx`, `Signup.tsx` — shadcn `Form` (react-hook-form + Zod resolver),
  `Input`, `Label`, `Button`, `Separator` for the "or" divider
- Google button: shadcn `Button` variant="outline", Google "G" icon, full
  width, placed above the divider — OAuth first since it's lower friction,
  matches common convention
- Client-side validation mirrors backend Zod schema (email format, password
  min length, confirm-password match) so errors show inline before hitting
  the network
- Loading state: button shows a spinner + disables while the request is in
  flight (shadcn doesn't ship a spinner — use a simple inline SVG or
  `Loader2` from lucide-react, already available via shadcn's icon
  convention)
- Error display: shadcn `Alert` (destructive variant) above the form for
  server-side errors (invalid credentials, email taken, etc.) — not a toast,
  since the user needs to see it while still looking at the form
- After signup success: swap the card content to the "check your email"
  state in place (Section 2) rather than routing away, so it feels like one
  continuous interaction
- `VerifyEmail.tsx` (`/verify-email` route): on mount, reads `?token=` from
  the URL, calls the verify endpoint, shows success/expired state
  accordingly, per Section 2

---

## 6. Email Sending

Build this as a provider-agnostic adapter, same pattern as the AI layer in
the implementation spec — the actual provider isn't fixed here, so don't
hardcode one:

```
services/email/
  index.ts            # exports sendVerificationEmail(to, link) -> picks adapter by env var
  resend.adapter.ts
  smtp.adapter.ts      # nodemailer-based, for any standard SMTP provider
```

Adapter chosen at runtime via `EMAIL_PROVIDER` env var, same swap pattern as
`AI_PROVIDER`. Verification email content: short, plain, one clear button/link
— "Verify your email" — expiring-in-24-hours note, no marketing content.

---

## 7. Environment Variables

Add these to `.env` (values to be filled in separately):

```
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend URL (for OAuth redirect + verification links)
FRONTEND_URL=http://localhost:3000

# Email sending
EMAIL_PROVIDER=resend          # resend | smtp
RESEND_API_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="Mapify <no-reply@yourdomain.com>"

# Verification token expiry (hours)
EMAIL_VERIFICATION_EXPIRY_HOURS=24
```

`JWT_SECRET` already exists from the implementation spec — no change needed
there.

---

## 8. Security Notes

- Rate-limit `/api/auth/login`, `/api/auth/signup`, and
  `/api/auth/resend-verification` — brute-force and email-bombing are the
  obvious abuse vectors on these three routes specifically
- Verification tokens: store hashed, single-use (clear on success), 24h
  expiry, cryptographically random (32+ bytes)
- Don't leak account existence through error message differences beyond
  what's specified above (the Google-vs-password message is an intentional,
  minor exception since it's genuinely helpful to the user)
- CORS: ensure the Google OAuth callback and cookie settings work correctly
  across your frontend/backend origins (`sameSite`, `secure` flags) —
  double-check this in production, not just localhost

---

## 9. Components (shadcn)

`Card`, `Form`, `Input`, `Label`, `Button`, `Separator`, `Alert`. Reuse
existing `Button` variants and the token setup already in place — nothing
new to configure here beyond what the dashboard/landing specs already set up.

---

## 10. Build Order

1. Prisma schema changes (Section 3) — migrate
2. Email adapter layer (Section 6) — test standalone by sending yourself a
   verification email before wiring into signup
3. Signup + login endpoints, email/password only, no OAuth yet — verify full
   loop: signup → email received → click link → verified
4. Google OAuth (Passport strategy, callback, find-or-create/link logic)
5. Frontend: `Login.tsx`, `Signup.tsx` static + validated, wired to backend
6. Frontend: post-signup "check your email" state, `VerifyEmail.tsx` page
7. Rate limiting + security pass (Section 8)
8. Visual pass: confirm both pages match dashboard tokens in both light and
   dark mode, keyboard focus rings visible, mobile layout check