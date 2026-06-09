#!/bin/sh
set -e

echo "▶ Running Prisma migrations..."
node_modules/.bin/prisma migrate deploy --schema=apps/api/prisma/schema.prisma

echo "▶ Starting Mantyx API..."
exec node dist/apps/api/main.js
