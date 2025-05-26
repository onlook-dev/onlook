import { FrameType } from "@onlook/models";
import { relations } from "drizzle-orm";
import { numeric, pgEnum, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { canvases } from "./canvas";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

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
}).enableRLS();

export const frameInsertSchema = createInsertSchema(frames);
export const frameUpdateSchema = createUpdateSchema(frames);

export type Frame = typeof frames.$inferSelect;
export type NewFrame = typeof frames.$inferInsert;

export const frameRelations = relations(frames, ({ one }) => ({
    canvas: one(canvases, {
        fields: [frames.canvasId],
        references: [canvases.id],
    }),
}));