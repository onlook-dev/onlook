import {
	int,
	mysqlTable,
	varchar as mysqlVarchar,
} from "drizzle-orm/mysql-core";
import { pgTable, serial, varchar } from "drizzle-orm/pg-core";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Simple cross-dialect "users" table definition helpers:
export const sqliteUsers = sqliteTable("users", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	email: text("email").notNull().unique(),
	name: text("name"),
});

export const pgUsers = pgTable("users", {
	id: serial("id").primaryKey(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	name: varchar("name", { length: 255 }),
});

export const mysqlUsers = mysqlTable("users", {
	id: int("id").primaryKey().autoincrement(),
	email: mysqlVarchar("email", { length: 255 }).notNull().unique(),
	name: mysqlVarchar("name", { length: 255 }),
});

export type User = {
	id: number;
	email: string;
	name: string | null;
};
