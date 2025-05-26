import { relations } from "drizzle-orm";
import { numeric, pgTable, uuid } from "drizzle-orm/pg-core";
import { projects } from "../project";
import { frames } from "./frame";
import { createUpdateSchema } from "drizzle-zod";

export const canvases = pgTable("canvas", {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
        .notNull()
        .references(() => projects.id, { onDelete: "cascade", onUpdate: "cascade" }),
    scale: numeric("scale").notNull(),
    x: numeric("x").notNull(),
    y: numeric("y").notNull(),
}).enableRLS();

export const canvasUpdateSchema = createUpdateSchema(canvases);

export type Canvas = typeof canvases.$inferSelect;
export type NewCanvas = typeof canvases.$inferInsert;

export const canvasRelations = relations(canvases, ({ one, many }) => ({
    frames: many(frames),
    project: one(projects, {
        fields: [canvases.projectId],
        references: [projects.id],
    }),
}));
