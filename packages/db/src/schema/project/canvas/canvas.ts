import { relations, sql } from "drizzle-orm";
import { numeric, pgPolicy, pgTable, uuid } from "drizzle-orm/pg-core";
import { projects } from "../project";
import { frames } from "./frame";

export const canvases = pgTable("canvas", {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
        .notNull()
        .references(() => projects.id, { onDelete: "cascade", onUpdate: "cascade" }),
    scale: numeric("scale").notNull(),
    x: numeric("x").notNull(),
    y: numeric("y").notNull(),
}, (table) => {
    return {
        viewPolicy: pgPolicy("Users can view their own canvases", {
            for: "select",
            to: "authenticated",
            using: sql`project_id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid())`
        }),
        createPolicy: pgPolicy("Users can create their own canvases", {
            for: "insert",
            to: "authenticated",
            using: sql`project_id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid())`
        }),
        updatePolicy: pgPolicy("Users can update their own canvases", {
            for: "update",
            to: "authenticated",
            using: sql`project_id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid())`
        }),
        deletePolicy: pgPolicy("Users can delete their own canvases", {
            for: "delete",
            to: "authenticated",
            using: sql`project_id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid())`
        })
    };
}).enableRLS();

export type Canvas = typeof canvases.$inferSelect;
export type NewCanvas = typeof canvases.$inferInsert;

export const canvasRelations = relations(canvases, ({ one, many }) => ({
    frames: many(frames),
    project: one(projects, {
        fields: [canvases.projectId],
        references: [projects.id],
    }),
}));
