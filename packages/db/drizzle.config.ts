import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/schema',
    out: './src/migrations',
    dialect: "postgresql",
    schemaFilter: ["public"],
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});
