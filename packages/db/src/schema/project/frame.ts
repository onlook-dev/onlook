import { relations } from "drizzle-orm";
import { numeric, pgEnum, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { canvas } from "./canvas";

export const frameType = pgEnum("frame_type", ["web"]);

export const frames = pgTable("frames", {
    id: uuid("id").primaryKey().defaultRandom(),
    canvasId: uuid("canvas_id").references(() => canvas.id).notNull(),
    type: frameType("type").notNull(),

    x: numeric("x").notNull(),
    y: numeric("y").notNull(),
    width: numeric("width").notNull(),
    height: numeric("height").notNull(),

    url: varchar("url").notNull(),
}).enableRLS();

export type Frame = typeof frames.$inferSelect;
export type NewFrame = typeof frames.$inferInsert;

export const frameRelations = relations(frames, ({ one }) => ({
    canvas: one(canvas, {
        fields: [frames.canvasId],
        references: [canvas.id],
    }),
}));