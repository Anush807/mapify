# Mapify — Implementation Spec

AI-powered roadmap generator. User inputs a topic, backend calls an AI provider, AI
returns a roadmap, backend validates/stores it, frontend renders it as a followable
path with progress tracking.

This spec is written for Claude Code to implement against. Follow it in the order
of the Implementation Phases section at the end. Ask before deviating from the data
model or API contract — everything else (component structure, exact styling) is
flexible.

---

## 1. Core Flow

```
User enters topic
  -> Frontend POST /api/roadmaps { topic }
  -> Backend builds prompt, calls AI provider adapter
  -> AI returns raw text (expected: JSON)
  -> Backend parses + validates against Zod schema
  -> On success: persist Roadmap row (content: Json), return it
  -> On validation failure: retry once with a stricter prompt, then fail with 422
  -> Frontend renders roadmap tree as an interactive path
  -> User can check off nodes -> PATCH /api/roadmaps/:id/progress
```

The critical design decision: **the AI never writes directly to the database.**
Its raw output always passes through a Zod schema validator first. If it doesn't
validate, it doesn't get stored. This is what makes "AI output is unpredictable"
a non-issue — the flexibility lives in the JSONB column, but only validated shapes
reach it.

---

## 2. Tech Stack

- **Backend:** Node.js, TypeScript, Express, CommonJS module system (`require`/`module.exports`, `tsconfig` target `commonjs`)
- **DB:** PostgreSQL + Prisma
- **Roadmap storage:** relational metadata (owner, topic, timestamps) + `content Json`
  column for the actual tree — see Section 3 for why
- **Validation:** Zod (validates AI output before persistence, and validates
  request bodies)
- **Auth:** JWT (access token, httpOnly cookie), bcrypt for password hashing
- **Frontend:** React + TypeScript, Tailwind CSS, shadcn/ui for components, Recoil for state
- **AI layer:** provider-agnostic adapter — see Section 5

---

## 3. Data Model

Single Postgres database via Prisma. Roadmap content is stored as JSONB because
it's a variable-depth tree that's generated once and read/rendered whole — it
doesn't need to be queried into at the DB level. Everything that IS relational
(who owns what, sharing, progress) stays in proper relational tables.

```prisma
// schema.prisma

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  passwordHash String
  name         String?
  createdAt    DateTime   @default(now())
  roadmaps     Roadmap[]
  progress     Progress[]
}

model Roadmap {
  id        String     @id @default(cuid())
  userId    String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  topic     String
  content   Json       // validated RoadmapSchema tree — see Section 4
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  progress  Progress[]

  @@index([userId])
}

model Progress {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  roadmapId     String
  roadmap       Roadmap  @relation(fields: [roadmapId], references: [id], onDelete: Cascade)
  completedIds  String[] // array of node ids from Roadmap.content marked complete
  updatedAt     DateTime @updatedAt

  @@unique([userId, roadmapId])
}
```

Notes:
- `Progress` is a separate table, not nested in `Roadmap.content`, because progress
  is per-user (a roadmap could later be shareable/cloneable) and changes far more
  often than the roadmap content itself — don't rewrite the whole JSON blob on
  every checkbox click.
- `completedIds` just tracks node ids the frontend already has from `content`; no
  need to duplicate node data.

---

## 4. Roadmap Content Schema (Zod)

This is the contract between AI output and storage. Every node needs a stable
`id` (frontend uses these for progress tracking and rendering keys).

```typescript
// schemas/roadmap.schema.ts
import { z } from 'zod';

const RoadmapNode: z.ZodType<any> = z.object({
  id: z.string(),                     // stable slug, e.g. "js-basics"
  title: z.string(),
  description: z.string().optional(),
  resources: z.array(z.string()).optional(), // links or reference names
  children: z.array(z.lazy(() => RoadmapNode)).optional().default([]),
});

const RoadmapSchema = z.object({
  topic: z.string(),
  title: z.string(),                  // AI-generated display title
  summary: z.string().optional(),
  nodes: z.array(RoadmapNode).min(1),
});

export type Roadmap = z.infer<typeof RoadmapSchema>;
module.exports = { RoadmapSchema, RoadmapNode };
```

Enforce max depth (e.g. 4 levels) and a max node count (e.g. 150) in application
code after parsing, to guard against a pathological AI response — Zod's
recursive schema alone won't catch runaway breadth.

---

## 5. AI Provider Layer (provider-agnostic)

Provider isn't decided yet, so build this as a swappable adapter from day one.
Every adapter implements the same interface; the AI provider is chosen at
runtime via `AI_PROVIDER` env var.

```
services/ai/
  index.ts          # exports generateRoadmap(topic) -> picks adapter by env var
  gemini.adapter.ts
  openai.adapter.ts
  claude.adapter.ts
  prompt.ts         # shared prompt builder
```

```typescript
// services/ai/index.ts
const provider = process.env.AI_PROVIDER || 'gemini';

const adapters: Record<string, { generateRoadmap: (topic: string) => Promise<string> }> = {
  gemini: require('./gemini.adapter'),
  openai: require('./openai.adapter'),
  claude: require('./claude.adapter'),
};

async function generateRoadmap(topic: string): Promise<string> {
  const adapter = adapters[provider];
  if (!adapter) throw new Error(`Unknown AI_PROVIDER: ${provider}`);
  return adapter.generateRoadmap(topic); // returns raw text
}

module.exports = { generateRoadmap };
```

Each adapter's job is narrow: take a topic, build the prompt (via shared
`prompt.js`), call its SDK, return raw text. Parsing/validation happens one
level up, identically regardless of provider — so swapping providers later is
a one-file change plus an env var flip.

**Prompt design (`prompt.js`):** instruct the model to return ONLY JSON matching
the RoadmapSchema shape, no markdown fences, no prose. Include the schema shape
in the prompt itself as a compact example. On validation failure, retry once
with an appended instruction: "Your previous output did not match the required
JSON shape. Return valid JSON only, matching this exact structure: ..."

---

## 6. Backend API

All routes under `/api`. Auth routes are public; roadmap routes require a valid
JWT (middleware: `middleware/requireAuth.js`).

```
POST   /api/auth/signup          { email, password, name } -> { user, token }
POST   /api/auth/login           { email, password }       -> { user, token }
POST   /api/auth/logout          -> clears cookie

POST   /api/roadmaps             { topic }        -> generates + persists, returns Roadmap
GET    /api/roadmaps             -> list current user's roadmaps (id, topic, title, createdAt)
GET    /api/roadmaps/:id         -> full roadmap + this user's progress
DELETE /api/roadmaps/:id

PATCH  /api/roadmaps/:id/progress   { completedIds: string[] }  -> upsert Progress
```

Folder structure (routes separated, CommonJS throughout):

```
backend/
  src/
    routes/
      auth.routes.ts
      roadmap.routes.ts
    controllers/
      auth.controller.ts
      roadmap.controller.ts
    services/
      ai/               (Section 5)
      roadmap.service.ts   # validation, retry-on-fail, persistence
    middleware/
      requireAuth.ts
      errorHandler.ts
    schemas/
      roadmap.schema.ts
      auth.schema.ts
    prisma/
      schema.prisma
    app.ts
    server.ts
  tsconfig.json
  .env
```

`POST /api/roadmaps` error cases to handle explicitly:
- AI call fails / times out -> 502, generic "generation failed, try again"
- AI output fails validation twice (initial + one retry) -> 422 with a message
  the frontend can show ("couldn't generate a valid roadmap for that topic")
- Topic empty/too long -> 400 via Zod on the request body

---

## 7. Frontend

React + TypeScript, Tailwind CSS, shadcn/ui for components (Button, Input, Card,
Checkbox, Progress, Dialog for auth forms), Recoil for state.

```
frontend/
  atoms/
    authAtom.ts
    currentRoadmapAtom.ts
    progressAtom.ts
  components/
    ui/                      # shadcn components (generated via shadcn CLI)
    TopicInput.tsx
    RoadmapView.tsx          # renders the tree
    RoadmapNode.tsx          # single node, recursive, has checkbox
    ProgressBar.tsx          # can wrap shadcn's Progress component
    AuthForm.tsx
  pages/ (or routes/ depending on router choice)
    Home.tsx                 # topic input + generate
    RoadmapPage.tsx          # view a saved roadmap
    Dashboard.tsx            # list of saved roadmaps
    Login.tsx / Signup.tsx
  lib/
    api.ts                   # fetch wrapper, attaches auth
```

**RoadmapView rendering:** render `content.nodes` recursively. Each node shows
title, optional description/resources on expand, and a shadcn `Checkbox`. Checkbox state
comes from Recoil `progressAtom` (a Set of completedIds), initialized from the
`GET /api/roadmaps/:id` response. Checking a box updates the atom immediately
(optimistic) and debounces a `PATCH .../progress` call (don't fire one request
per click — batch/debounce ~500ms).

**Visual path framing:** since the point is "a path to follow," lean into
sequential/tree visual language — connecting lines between parent and child
nodes, a completed-vs-upcoming visual state per node, and a top-level progress
bar (`completedIds.length / totalNodeCount`). Don't just render a plain nested
bullet list.

---

## 8. Auth

- Signup: bcrypt-hash password, create User, issue JWT
- Login: verify bcrypt hash, issue JWT
- JWT stored as httpOnly cookie (not localStorage — avoids XSS token theft)
- `requireAuth` middleware verifies JWT on protected routes, attaches `req.userId`
- Frontend: `authAtom` holds current user (null if logged out); `lib/api.js`
  fetch wrapper includes credentials so the cookie rides along automatically

---

## 9. Environment Variables

```
DATABASE_URL=postgresql://...
JWT_SECRET=
AI_PROVIDER=gemini        # gemini | openai | claude
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

---

## 10. Implementation Phases

Build in this order — each phase should be independently runnable/testable.

1. **Prisma + DB setup** — schema above, migrate, seed script optional
2. **Auth** — signup/login/logout, JWT middleware, test with curl/Postman
3. **AI layer** — pick Gemini as the default adapter to start (matches prior
   CogniCode experience), build `prompt.js` + `gemini.adapter.js` +
   `roadmap.schema.js`, test roadmap generation standalone (no DB yet) by
   logging validated output
4. **Roadmap CRUD** — wire AI layer into `POST /api/roadmaps`, persist, add
   GET/list/delete
5. **Progress endpoint** — `PATCH .../progress`, upsert logic
6. **Frontend: generate + view** — topic input, call API, render RoadmapView
   with the tree (no auth wiring yet, no progress)
7. **Frontend: auth** — login/signup forms, protect dashboard/generate behind
   auth, wire `authAtom`
8. **Frontend: progress tracking** — checkboxes, `progressAtom`, debounced
   PATCH, progress bar
9. **Polish** — loading/error states for AI generation (this can take several
   seconds — show a real loading state, not a spinner with no context), empty
   states, retry-on-422 messaging

Additional adapters (`openai.adapter.js`, `claude.adapter.js`) can be added any
time after Phase 3 without touching anything else — that's the point of the
adapter layer.