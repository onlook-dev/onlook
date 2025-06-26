import { relations } from 'drizzle-orm';
import { boolean, pgTable, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { users } from './user';

export const userSettings = pgTable("user_settings", {
    id: uuid("id")
        .primaryKey(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" })
        .unique(),
    autoApplyCode: boolean("auto_apply_code").notNull().default(true),
    expandCodeBlocks: boolean("expand_code_blocks").notNull().default(true),
    showSuggestions: boolean("show_suggestions").notNull().default(true),
    showMiniChat: boolean("show_mini_chat").notNull().default(true),
    shouldWarnDelete: boolean("should_warn_delete").notNull().default(true),
}).enableRLS();

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
    user: one(users, {
        fields: [userSettings.userId],
        references: [users.id],
    }),
}));

export const userSettingsInsertSchema = createInsertSchema(userSettings);
export const userSettingsUpdateSchema = createUpdateSchema(userSettings);
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
