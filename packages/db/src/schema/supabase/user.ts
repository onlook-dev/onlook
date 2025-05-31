import { jsonb, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

const authSchema = pgSchema('auth');

export const authUsers = authSchema.table('users', {
    id: uuid('id').primaryKey(),
    email: text('email').notNull(),
    emailConfirmedAt: timestamp('email_confirmed_at'),
    rawUserMetaData: jsonb('raw_user_meta_data'),
});

export type AuthUser = typeof authUsers.$inferSelect;
