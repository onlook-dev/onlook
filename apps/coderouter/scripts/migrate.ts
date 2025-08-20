import "dotenv/config";
import { execSync } from "node:child_process";

try {
	execSync("bun x drizzle-kit migrate", { stdio: "inherit" });
} catch (e) {
	console.error("Migration failed", e);
	process.exit(1);
}
