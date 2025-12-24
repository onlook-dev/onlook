import { relations } from "drizzle-orm";
import { numeric, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
import { branches } from "../project";
import { canvases } from "./canvas";

export const frames = pgTable("frames", {
    id: uuid("id").primaryKey().defaultRandom(),
    canvasId: uuid("canvas_id")
        .notNull()
        .references(() => canvases.id, { onDelete: "cascade", onUpdate: "cascade" }),
    branchId: uuid("branch_id")
        // .notNull() // will need to be null before final migration
        .references(() => branches.id, { onDelete: "cascade", onUpdate: "cascade" }),
    url: varchar("url").notNull(),

    // display data
    x: numeric("x").notNull(),
    y: numeric("y").notNull(),
    width: numeric("width").notNull(),
    height: numeric("height").notNull(),

    // deprecated
    type: text("type"),
}).enableRLS();

export const frameInsertSchema = createInsertSchema(frames);
export const frameUpdateSchema = createUpdateSchema(frames, {
    id: z.uuid(),
});

export type Frame = typeof frames.$inferSelect;
export type NewFrame = typeof frames.$inferInsert;

export const frameRelations = relations(frames, ({ one }) => ({
    canvas: one(canvases, {
        fields: [frames.canvasId],
        references: [canvases.id],
    }),
    branch: one(branches, {
        fields: [frames.branchId],
        references: [branches.id],
    }),
}));