import { relations } from "drizzle-orm";
import { numeric, pgTable, uuid } from "drizzle-orm/pg-core";
import { projects } from "../project";
import { frames } from "./frame";

export const canvas = pgTable("canvas", {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
        .notNull()
        .references(() => projects.id, { onDelete: "cascade", onUpdate: "cascade" }),
    scale: numeric("scale").notNull(),
    x: numeric("x").notNull(),
    y: numeric("y").notNull(),
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
