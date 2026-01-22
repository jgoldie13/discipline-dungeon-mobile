#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL must be set to an EMPTY database." >&2
  exit 1
fi

if [ "${REQUIRE_EMPTY_DB:-}" != "true" ]; then
  echo "Refusing to run: set REQUIRE_EMPTY_DB=true to confirm the DB is empty." >&2
  exit 1
fi

echo "Running prisma migrate deploy against empty DB..."
npx prisma migrate deploy

echo "Running prisma migrate status..."
npx prisma migrate status
