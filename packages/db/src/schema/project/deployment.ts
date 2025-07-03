import { DeploymentStatus, DeploymentType } from '@onlook/models';
import { relations } from 'drizzle-orm';
import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { users } from '../user/user';
import { projects } from './project';

export const deploymentStatus = pgEnum('deployment_status', DeploymentStatus);
export const deploymentType = pgEnum('deployment_type', DeploymentType);

export const deployments = pgTable('deployments', {
    id: uuid('id').primaryKey(),
    requestedBy: uuid('requested_by').references(() => users.id).notNull(),
    projectId: uuid('project_id').references(() => projects.id).notNull(),
    sandboxId: text('sandbox_id'),
    urls: text('urls').array(),

    type: deploymentType('type').notNull(),
    status: deploymentStatus('status').notNull(),

    message: text('message'),
    buildLog: text('build_log'),
    error: text('error'),
    progress: integer('progress'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const deploymentRelations = relations(deployments, ({ one }) => ({
    project: one(projects, {
        fields: [deployments.projectId],
        references: [projects.id],
    }),
    requestedBy: one(users, {
        fields: [deployments.requestedBy],
        references: [users.id],
    }),
}));


export const deploymentInsertSchema = createInsertSchema(deployments);
export const deploymentUpdateSchema = createUpdateSchema(deployments);

export type Deployment = typeof deployments.$inferSelect;
export type NewDeployment = typeof deployments.$inferInsert;
