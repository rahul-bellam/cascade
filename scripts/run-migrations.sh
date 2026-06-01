#!/bin/bash
set -e

MIGRATIONS_DIR="$(dirname "$0")/migrations"
if [ -z "$DATABASE_URL" ]; then
    DATABASE_URL="postgres://postgres:cascade_dev@localhost:5432/cascade?sslmode=disable"
fi

for f in "$MIGRATIONS_DIR"/*.sql; do
    echo "Running $f..."
    psql "$DATABASE_URL" -f "$f" -q
    echo "  ✅ $(basename "$f") applied"
done

echo "All migrations applied successfully."
