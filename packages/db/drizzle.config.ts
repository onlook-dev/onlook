import { defineConfig } from 'drizzle-kit';

const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

export default defineConfig({
    schema: './src/schema',
    out: '../../apps/backend/supabase/migrations',
    dialect: "postgresql",
    schemaFilter: ["public"],
    dbCredentials: {
        url: process.env.SUPABASE_DATABASE_URL ?? DEFAULT_DATABASE_URL,
    },
    entities: {
        roles: {
            provider: 'supabase'
        }
    }
});