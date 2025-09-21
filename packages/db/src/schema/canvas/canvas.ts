import { relations } from 'drizzle-orm';
import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { createUpdateSchema } from 'drizzle-zod';
import { projects } from '../project';
import { userCanvases } from '../user';
import { frames } from './frame';

export const canvases = pgTable('canvas', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
}).enableRLS();

export const canvasUpdateSchema = createUpdateSchema(canvases);

export type Canvas = typeof canvases.$inferSelect;
export type NewCanvas = typeof canvases.$inferInsert;

export const canvasRelations = relations(canvases, ({ one, many }) => ({
    frames: many(frames),
    userCanvases: many(userCanvases),
    project: one(projects, {
        fields: [canvases.projectId],
        references: [projects.id],
    }),
}));
