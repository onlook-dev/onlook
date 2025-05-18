import { FrameType } from "@onlook/models";
import { relations, sql } from "drizzle-orm";
import { numeric, pgEnum, pgPolicy, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { canvases } from "./canvas";

export const frameType = pgEnum("frame_type", FrameType);

export const frames = pgTable("frames", {
    id: uuid("id").primaryKey().defaultRandom(),
    canvasId: uuid("canvas_id")
        .notNull()
        .references(() => canvases.id, { onDelete: "cascade", onUpdate: "cascade" }),
    type: frameType("type").notNull(),
    url: varchar("url").notNull(),

    x: numeric("x").notNull(),
    y: numeric("y").notNull(),

    width: numeric("width").notNull(),
    height: numeric("height").notNull(),
}, (table) => {
    return {
        viewPolicy: pgPolicy("Users can view their own frames", {
            for: "select",
            to: "authenticated",
            using: sql`canvas_id IN (SELECT id FROM canvas WHERE project_id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid()))`
        }),
        createPolicy: pgPolicy("Users can create their own frames", {
            for: "insert",
            to: "authenticated",
            using: sql`canvas_id IN (SELECT id FROM canvas WHERE project_id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid()))`
        }),
        updatePolicy: pgPolicy("Users can update their own frames", {
            for: "update",
            to: "authenticated",
            using: sql`canvas_id IN (SELECT id FROM canvas WHERE project_id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid()))`
        }),
        deletePolicy: pgPolicy("Users can delete their own frames", {
            for: "delete",
            to: "authenticated",
            using: sql`canvas_id IN (SELECT id FROM canvas WHERE project_id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid()))`
        })
    };
}).enableRLS();

export type Frame = typeof frames.$inferSelect;
export type NewFrame = typeof frames.$inferInsert;

export const frameRelations = relations(frames, ({ one }) => ({
    canvas: one(canvases, {
        fields: [frames.canvasId],
        references: [canvases.id],
    }),
}));
