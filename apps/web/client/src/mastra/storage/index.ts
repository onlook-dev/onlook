import { PostgresStore } from "@mastra/pg";
import { env } from "~/env";

export const storage = new PostgresStore({
    connectionString: env.SUPABASE_DATABASE_URL,
})