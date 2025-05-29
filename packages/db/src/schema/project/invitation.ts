import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, text, timestamp, uuid, varchar, unique } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { projectRole, users } from '../user';
import { projects } from './project';

export const projectInvitations = pgTable(
    'project_invitations',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        projectId: uuid('project_id')
            .notNull()
            .references(() => projects.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
        inviterId: uuid('inviter_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
        inviteeEmail: varchar('invitee_email').notNull(),
        token: varchar('token').notNull().unique(),
        role: projectRole('role').notNull(),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        uniqueEmailProject: unique().on(table.inviteeEmail, table.projectId),
    }),
).enableRLS();

export const projectInvitationInsertSchema = createInsertSchema(projectInvitations);
export const projectInvitationUpdateSchema = createUpdateSchema(projectInvitations);

export type ProjectInvitation = typeof projectInvitations.$inferSelect;
export type NewProjectInvitation = typeof projectInvitations.$inferInsert;

export const projectInvitationRelations = relations(projectInvitations, ({ one }) => ({
    project: one(projects, {
        fields: [projectInvitations.projectId],
        references: [projects.id],
    }),
    inviter: one(users, {
        fields: [projectInvitations.inviterId],
        references: [users.id],
        relationName: 'inviter',
    }),
}));
