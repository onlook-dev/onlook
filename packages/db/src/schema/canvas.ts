import type { RectPosition } from "@onlook/models";
import { jsonb, numeric, pgTable, uuid } from "drizzle-orm/pg-core";
import { projects } from "./project";

export const canvasSettings = pgTable("canvas_settings", {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id).notNull(),
    scale: numeric("scale"),
    position: jsonb("position").$type<RectPosition | null>(),
}).enableRLS();

export type CanvasSettings = typeof canvasSettings.$inferSelect;
export type NewCanvasSettings = typeof canvasSettings.$inferInsert;
