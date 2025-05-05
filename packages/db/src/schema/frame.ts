import { numeric, pgEnum, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { canvasSettings } from "./canvas";

export const frameType = pgEnum("frame_type", ["web"]);

export const frames = pgTable("frames", {
    id: uuid("id").primaryKey().defaultRandom(),
    canvasId: uuid("canvas_id").references(() => canvasSettings.id).notNull(),
    type: frameType("type").notNull(),

    x: numeric("x").notNull(),
    y: numeric("y").notNull(),
    width: numeric("width").notNull(),
    height: numeric("height").notNull(),

    url: varchar("url", { length: 2048 }),
}).enableRLS();

export type Frame = typeof frames.$inferSelect;
export type NewFrame = typeof frames.$inferInsert;
