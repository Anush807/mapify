#!/bin/sh
set -e

# Compose already waits for Postgres to pass its healthcheck, so this only has
# to apply whatever migrations the image was built with. `deploy` (not `dev`)
# never prompts and never tries to author a new migration.
echo "[entrypoint] applying database migrations"
npx prisma migrate deploy

echo "[entrypoint] starting: $*"
exec "$@"
