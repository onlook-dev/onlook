import { pgSchema, uuid } from 'drizzle-orm/pg-core';

// Public auth schema from Supabase. 
const authSchema = pgSchema('auth');

// Auth user table from Supabase. Used for foreign key references.
export const authUsers = authSchema.table('users', {
    id: uuid('id').primaryKey(),
});