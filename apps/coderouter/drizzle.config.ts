import "dotenv/config";

export default {
	out: "./drizzle",
	schema: "./src/db/schema.ts",
	dialect:
		process.env.DRIZZLE_DB === "postgres"
			? "postgresql"
			: process.env.DRIZZLE_DB === "mysql"
				? "mysql"
				: "sqlite",
	dbCredentials: {
		connectionString: process.env.DATABASE_URL,
	},
};
