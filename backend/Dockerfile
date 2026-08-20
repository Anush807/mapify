# syntax=docker/dockerfile:1

# ---- build ----------------------------------------------------------------
# Debian slim rather than Alpine: Prisma's engines want glibc + openssl, and
# fighting musl here buys nothing.
FROM node:22-slim AS build
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json prisma.config.ts ./
COPY src ./src

# Order matters: the client is generated into src/generated/prisma, which is
# inside rootDir, so it has to exist before tsc runs or the build can't resolve it.
RUN npx prisma generate && npm run build

# ---- runtime --------------------------------------------------------------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# The full dependency tree is kept on purpose: `prisma migrate deploy` runs at
# startup, and the Prisma CLI is a devDependency that also has to load the
# TypeScript prisma.config.ts. Pruning to production deps breaks both.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
# Schema + migration history, read by `migrate deploy`.
COPY --from=build /app/src/prisma ./src/prisma

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER node
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
