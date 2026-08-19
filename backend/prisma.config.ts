import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer auto-loads .env, reads package.json#prisma, or accepts a
// `url` in the schema's datasource block — all of that lives here now.
export default defineConfig({
  schema: path.join('src', 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join('src', 'prisma', 'migrations'),
  },
  datasource: {
    url: process.env.DATABASE_URL,
    // Only used by `prisma migrate diff/dev` to compute migrations; never by
    // the app at runtime.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
