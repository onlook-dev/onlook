import { eq } from "drizzle-orm";
import { type Frame, projects, userProjects, type DrizzleDb } from "@onlook/db";

/** Type representing a db instance or transaction that has query capabilities */
type DbOrTx = Pick<DrizzleDb, 'query'>;

export function extractCsbPort(frames: Frame[]): number | null {
    if (!frames || frames.length === 0) return null;

    for (const frame of frames) {
        if (frame.url) {
            // Match CSB preview URL pattern: https://sandboxId-port.csb.app
            const match = frame.url.match(/https:\/\/[^-]+-(\d+)\.csb\.app/);
            if (match && match[1]) {
                const port = parseInt(match[1], 10);
                if (!isNaN(port)) {
                    return port;
                }
            }
        }
    }
    return null;
}

/**
 * Verifies that a user has access to a project by checking the userProjects table.
 * @throws Error if the user does not have access to the project or if it doesn't exist
 *
 * Note: This function intentionally returns the same error message whether the project
 * doesn't exist or the user lacks access to prevent information disclosure about
 * project existence.
 *
 * Accepts either a db instance or a transaction to support atomic authorization checks.
 */
export async function verifyProjectAccess(
    db: DbOrTx,
    userId: string,
    projectId: string,
): Promise<void> {
    const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
        with: {
            userProjects: {
                where: eq(userProjects.userId, userId),
            },
        },
    });

    if (!project || project.userProjects.length === 0) {
        throw new Error('Unauthorized or not found');
    }
}
