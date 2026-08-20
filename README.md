# Mapify

AI-powered roadmap generator. Enter a topic, the backend asks an AI provider for a
learning path, validates the response against a Zod schema, stores it, and the
frontend renders it as a followable path with per-user progress tracking.

The design invariant: **the AI never writes directly to the database.** Raw model
output is parsed and validated against `RoadmapSchema` before anything is
persisted. Invalid output gets exactly one retry with the specific validation
error fed back into the prompt, then fails with a 422.

## Stack

| | |
|---|---|
| Backend | Node + TypeScript (CommonJS), Express 5, Prisma 7, Zod 4 |
| Database | PostgreSQL — relational metadata + `content` JSONB for the tree |
| Auth | JWT in an httpOnly cookie, bcrypt password hashing |
| Frontend | React 19 + TypeScript, Vite, Tailwind, shadcn/ui, Jotai, React Router, Lenis |
| AI | Provider-agnostic adapters — Gemini, OpenAI, Claude, plus a keyless `mock` |

## Run it with Docker

The quickest way to get the whole stack — Postgres, the API, and the built app
behind nginx — running from nothing.

```bash
cp .env.example .env      # then set JWT_SECRET to anything 16+ characters
docker compose up --build
```

Open **http://localhost:8090**.

That's it. The database schema is applied automatically on startup, and with the
defaults (`AI_PROVIDER=mock`, `EMAIL_PROVIDER=log`) the entire product works with
no third-party credentials at all.

### What you get

| Service | Address | Notes |
|---|---|---|
| `web` | http://localhost:8090 | The built app on nginx, which also proxies `/api` to the API |
| `api` | http://localhost:3001 | Published only for debugging — the app reaches it internally |
| `db` | localhost:5435 | Postgres 16, data kept in the `mapify-db-data` volume |

Ports come from `.env` (`WEB_PORT`, `API_PORT`, `DB_PORT`) if any of them clash
with something you already run. If you change `WEB_PORT`, change `APP_URL` to
match — it's the origin used for verification links and the OAuth redirect.

### Using real AI generation

Set two values in `.env` and restart the API:

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key

docker compose up -d api
```

Generation takes roughly 15–25 seconds; nginx is configured to wait up to 180s
so a slow run isn't cut off mid-request.

### Verification emails without an email provider

`EMAIL_PROVIDER=log` prints the message instead of sending it, so the signup →
verify loop works offline. Grab the link from the API's logs:

```bash
docker compose logs api | grep verify-email
```

Point `EMAIL_PROVIDER` at `resend` or `smtp` and fill in the matching credentials
to send real mail.

### Everyday commands

```bash
docker compose logs -f api      # follow the API (migrations, AI calls, emails)
docker compose up -d --build    # rebuild after changing code
docker compose down             # stop everything, keep the database
docker compose down -v          # stop everything and delete the database
docker compose exec db psql -U mapify -d mapify   # open a psql shell
```

### Notes

- **Code changes need a rebuild.** These images bake in a production build;
  there's no hot reload. For day-to-day development, run the app directly
  instead — see [Getting started](#getting-started) below.
- **`NODE_ENV=production` marks the auth cookie `Secure`.** Browsers treat
  `http://localhost` as a secure context, so signing in works locally. If you
  serve this from any other host over plain HTTP, the cookie is silently
  dropped and login appears to do nothing — put it behind HTTPS, or set
  `NODE_ENV=development` in `.env` for a throwaway deployment.
- **Google sign-in is optional.** Leave `GOOGLE_CLIENT_ID` blank and the app
  falls back to email/password with a clear message on the login page.

## Getting started

Running the pieces directly, which is what you want while developing — hot
reload on both sides.

### 1. Database

Any Postgres 14+ works. Either start a standalone one:

```bash
docker run -d --name mapify-postgres \
  -e POSTGRES_USER=mapify -e POSTGRES_PASSWORD=mapify -e POSTGRES_DB=mapify \
  -p 5434:5432 -v mapify-pgdata:/var/lib/postgresql/data postgres:16
```

…or reuse the one from the Compose stack with just `docker compose up -d db`,
and point `DATABASE_URL` at `localhost:5435`.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in DATABASE_URL and JWT_SECRET
npx prisma migrate dev    # creates the schema
npm run dev               # http://localhost:3000
```

`AI_PROVIDER=mock` runs the whole flow with no API key. Switch to `gemini`,
`openai`, or `claude` and set the matching key to use a real model.

Gemini takes roughly 15–20 seconds per roadmap. The model is set by
`GEMINI_MODEL` (default `gemini-flash-latest`) — an alias, so a model retirement
doesn't break generation the way `gemini-2.5-flash` being withdrawn did.

The free tier allows only **20 requests per day, counted per model**. Once spent,
the API returns 429 until it resets and the server log says so explicitly.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Vite proxies `/api` to `localhost:3000`, so the app is same-origin in dev and the
auth cookie needs no CORS negotiation.

## Deploying

The app runs on **https://www.mapify.info** (Vercel) and the API on its own
subdomain, **https://api.mapify.info**. Those are different *origins* but the
same *site* (`mapify.info`), which is why the httpOnly auth cookie keeps working
with `SameSite=Strict` — CORS is required, `SameSite=None` is not.

### 1. API — any container host

`backend/Dockerfile` is the deployable unit; it applies migrations on startup.
Render, Railway, Fly.io and a plain VPS all work. Point `api.mapify.info` at it
and terminate TLS there.

Set the environment from **`backend/.env.production.example`**. Three values are
easy to get wrong:

| Variable | Value | Why |
|---|---|---|
| `CORS_ORIGIN` | `https://www.mapify.info` | Comma-separated, **no quotes** — dotenv keeps quotes and they end up inside the split values, so nothing matches |
| `FRONTEND_URL` | `https://www.mapify.info` | A single URL, not a list: it's concatenated into verification links |
| `GOOGLE_CALLBACK_URL` | `https://api.mapify.info/api/auth/google/callback` | On the **API** origin, and must match the Google console verbatim |

### 2. App — Vercel

Set one build-time variable, then redeploy:

```
VITE_API_URL=https://api.mapify.info/api
```

Without it the app calls a relative `/api`, which 404s on Vercel. `vercel.json`
supplies the SPA rewrite so deep links (`/dashboard`, `/verify-email?token=…`)
serve `index.html` instead of a 404 — without it, **every verification email link
is broken**.

### 3. Third-party consoles

- **Google Cloud** → authorised redirect URI `https://api.mapify.info/api/auth/google/callback`,
  authorised JavaScript origin `https://www.mapify.info`.
- **Resend** → verify the `mapify.info` domain before sending from
  `no-reply@mapify.info`, or delivery silently fails.

## Backend scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with reload (`tsx watch`) |
| `npm run build` / `npm start` | Compile to `dist/` and run the compiled output |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:ai -- "learn rust"` | Generate + validate a roadmap, no DB involved |
| `npx prisma migrate dev` | Apply schema changes |

## API

Auth routes are public; every roadmap route requires a valid JWT and is scoped to
its owner.

```
POST   /api/auth/signup            { email, password, confirmPassword } -> { user, token }
POST   /api/auth/login             { email, password }        -> { user, token }
POST   /api/auth/logout            -> clears the cookie
GET    /api/auth/me                -> { user }   (rehydrates the client on reload)

GET    /api/auth/google            -> starts the OAuth redirect (503 if unconfigured)
GET    /api/auth/google/callback   -> links or creates the user, sets the cookie
GET    /api/auth/verify-email?token=...     -> marks the address verified (single use)
POST   /api/auth/resend-verification        -> { email? }; session works too

POST   /api/roadmaps               { topic }     -> generates, validates, persists
GET    /api/roadmaps               -> the current user's roadmaps + progress counts
GET    /api/roadmaps/:id           -> full roadmap + this user's progress
DELETE /api/roadmaps/:id
PATCH  /api/roadmaps/:id/progress  { completedIds: string[] } -> upserts Progress
```

`POST /api/roadmaps` distinguishes its failure modes so the UI can respond
differently to each:

- **400** — topic empty, too short, or too long (Zod, on the request body)
- **422** — AI output failed validation twice; the topic needs rewording
- **502** — the provider itself failed or timed out; retrying as-is is reasonable

## How it fits together

```
POST /api/roadmaps
  -> services/ai/          picks an adapter by AI_PROVIDER, returns raw text
  -> roadmap.service       extract JSON -> Zod parse -> depth/count/unique-id guards
                           on failure: one retry with the error fed back in
  -> Prisma                persists { userId, topic, content: <validated tree> }
```

`services/ai/*` adapters do exactly one thing: topic in, raw text out. They never
parse or validate, so swapping providers is a one-file change plus an env flip.

Progress lives in its own table keyed `(userId, roadmapId)` rather than inside the
JSON blob — it's per-user and changes far more often than the roadmap does, so a
checkbox click must never rewrite the tree. On the client, ticking a box updates
the Jotai `progressAtom` immediately and debounces the `PATCH` by 500ms, so a
burst of clicks costs one request.

The spec calls for Recoil; this uses **Jotai** instead. Recoil is unmaintained and
reads a React internal that React 19 removed, so it renders a blank page there.

## Pages

| Route | What it is |
|---|---|
| `/` | Public landing page — light-only, its own nav and footer |
| `/new` | Generate a roadmap from a topic |
| `/dashboard` | Your saved roadmaps |
| `/roadmap/:id` | One roadmap, with progress tracking |
| `/login`, `/signup` | Auth — email/password or Google |
| `/verify-email` | Landing page for the emailed verification link |

## The roadmap tree

The tree is the product's signature element. Nodes are laid out in the DOM and the
connecting curves are drawn as a single SVG overlay measured from the live marker
positions, so titles wrap and branches collapse while the path stays accurate.
Consecutive top-level stages are joined into one continuous trunk; each stage's
contents branch off it. Completed segments are drawn in a gradient that runs the
full height of the tree — orange near the start, deepening to red-violet as the
path is travelled — and completing a node animates its incoming segment from
dashed to solid.

Light and dark are both first-class (`.dark` on `<html>`, persisted, with a
system option). Smooth scrolling uses Lenis, and every piece of motion — Lenis
included — is dropped when `prefers-reduced-motion: reduce` is set.
