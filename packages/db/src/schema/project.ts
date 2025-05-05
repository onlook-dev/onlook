import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { canvas } from './canvas';
import { userProjects } from './user-project';

export const projects = pgTable("projects", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }),
    previewUrl: varchar("preview_url", { length: 2048 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    previewImg: varchar("preview_img", { length: 2048 }),
    sandboxId: varchar("sandbox_id", { length: 64 }),
    sandboxUrl: varchar("sandbox_url", { length: 2048 }),
}).enableRLS();

export const projectInsertSchema = createInsertSchema(projects);

export const projectRelations = relations(projects, ({ one, many }) => ({
    canvas: one(canvas, {
        fields: [projects.id],
        references: [canvas.projectId],
    }),
    userProjects: many(userProjects),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
