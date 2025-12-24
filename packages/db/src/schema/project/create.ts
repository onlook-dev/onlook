import { ProjectCreateRequestStatus, type CreateRequestContext } from '@onlook/models';
import { jsonb, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { projects } from './project';


export const projectCreateStatus = pgEnum('project_create_status', ProjectCreateRequestStatus);

export const projectCreateRequests = pgTable(
    'project_create_requests',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        projectId: uuid('project_id')
            .notNull()
            .unique()
            .references(() => projects.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
        context: jsonb("context").$type<CreateRequestContext[]>().notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
        status: projectCreateStatus('status').notNull().default(ProjectCreateRequestStatus.PENDING),
    },
).enableRLS();

export const projectCreateRequestInsertSchema = createInsertSchema(projectCreateRequests);
export const projectCreateRequestUpdateSchema = createUpdateSchema(projectCreateRequests);

export type ProjectCreateRequest = typeof projectCreateRequests.$inferSelect;
export type NewProjectCreateRequest = typeof projectCreateRequests.$inferInsert;
