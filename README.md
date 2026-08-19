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

## Getting started

### 1. Database

Any Postgres 14+ works. The dev instance used here runs in Docker:

```bash
docker run -d --name mapify-postgres \
  -e POSTGRES_USER=mapify -e POSTGRES_PASSWORD=mapify -e POSTGRES_DB=mapify \
  -p 5434:5432 -v mapify-pgdata:/var/lib/postgresql/data postgres:16
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in DATABASE_URL and JWT_SECRET
npx prisma migrate dev    # creates the schema
npm run dev               # http://localhost:3000
```

`AI_PROVIDER=mock` is the default in `.env` so the whole flow runs with no API
key. Switch to `gemini`, `openai`, or `claude` and set the matching key to use a
real model.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Vite proxies `/api` to `localhost:3000`, so the app is same-origin in dev and the
auth cookie needs no CORS negotiation.

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
