import type { RectPosition } from "@onlook/models";
import { relations } from "drizzle-orm";
import { jsonb, numeric, pgTable, uuid } from "drizzle-orm/pg-core";
import { frames } from "./frame";
import { projects } from "./project";

export const canvas = pgTable("canvas", {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id).notNull(),
    scale: numeric("scale").notNull(),
    position: jsonb("position").$type<RectPosition | null>(),
}).enableRLS();

export type Canvas = typeof canvas.$inferSelect;
export type NewCanvas = typeof canvas.$inferInsert;

export const canvasRelations = relations(canvas, ({ one, many }) => ({
    frames: many(frames),
    project: one(projects, {
        fields: [canvas.projectId],
        references: [projects.id],
    }),
}));
