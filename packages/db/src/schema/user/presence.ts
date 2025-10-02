import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { projects } from '../project';
import { users } from './user';

export const userPresence = pgTable('user_presence', {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    lastSeen: timestamp('last_seen', { withTimezone: true }).defaultNow().notNull(),
    isOnline: boolean('is_online').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    unique: {
        projectUser: [table.projectId, table.userId],
    },
})).enableRLS();

export const userPresenceRelations = relations(userPresence, ({ one }) => ({
    project: one(projects, {
        fields: [userPresence.projectId],
        references: [projects.id],
    }),
    user: one(users, {
        fields: [userPresence.userId],
        references: [users.id],
    }),
}));

export const userPresenceInsertSchema = createInsertSchema(userPresence);
export type UserPresence = typeof userPresence.$inferSelect;
export type NewUserPresence = typeof userPresence.$inferInsert;
