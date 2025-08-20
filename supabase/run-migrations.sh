#!/bin/bash
set -e

echo "Waiting for database to be ready..."
until pg_isready -h postgres -p 5432 -U postgres; do
    echo "Database not ready, waiting..."
    sleep 2
done

echo "Database is ready. Running migrations..."

# Run all migration files in order
for migration_file in /migrations/*.sql; do
    if [ -f "$migration_file" ]; then
        echo "Running migration: $(basename "$migration_file")"
        PGPASSWORD=postgres psql -h postgres -U postgres -d postgres -f "$migration_file" || {
            echo "Warning: Migration $(basename "$migration_file") may have already been applied or failed"
        }
    fi
done

echo "Migration runner completed."