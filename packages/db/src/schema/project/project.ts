import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { userProjects } from '../user';
import { canvas } from './canvas';

export const projects = pgTable("projects", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name").notNull(),
    previewUrl: varchar("preview_url").notNull(),
    sandboxId: varchar("sandbox_id").notNull(),
    sandboxUrl: varchar("sandbox_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    previewImg: varchar("preview_img"),
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
