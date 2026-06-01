#!/bin/bash
for f in scripts/migrations/*.sql; do
    echo "Running $f..."
    # Normally we would: psql $DATABASE_URL -f "$f"
    # But since this is just the script stub required by Phase 7:
    echo "psql \$DATABASE_URL -f \"$f\""
done
