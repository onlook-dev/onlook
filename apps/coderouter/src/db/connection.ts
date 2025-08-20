import "dotenv/config";
// import { drizzle } from "drizzle-orm";
// import { Database } from "drizzle-orm/sqlite-proxy";
import { mysqlUsers, pgUsers, sqliteUsers } from "./schema";
// import { createPool as createPgPool } from "pg";
// import mysql from "mysql2/promise";
// import DatabaseSqlite from "better-sqlite3";

export type DBKind = "postgres" | "mysql" | "sqlite";

export const dbKind: DBKind = (process.env.DRIZZLE_DB as DBKind) || "sqlite";

export async function getDb() {
	// if (dbKind === "postgres") {
	// 	const { Pool } = await import('pg'); // Lazy if needed
	// 	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	// 	return drizzle(pool);
	// } else if (dbKind === "mysql") {
	// 	return mysql
	// 		.createConnection(process.env.DATABASE_URL!)
	// 		.then((conn) => drizzle(conn));
	// } else {
	// 	const sqlite = new DatabaseSqlite(
	// 		process.env.DATABASE_URL?.replace("file:", "") || "dev.sqlite",
	// 	);
	// 	// @ts-ignore - drizzle typing
	// 	return drizzle(sqlite);
	// }
}

// helpers to pick correct table (for demo)
export const usersTable =
	dbKind === "postgres"
		? pgUsers
		: dbKind === "mysql"
			? mysqlUsers
			: sqliteUsers;
