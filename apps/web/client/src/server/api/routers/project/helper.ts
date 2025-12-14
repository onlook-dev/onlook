import { eq } from "drizzle-orm";
import { type Frame, projects, userProjects, type DrizzleDb } from "@onlook/db";

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
 * @throws Error if the user does not have access to the project
 */
export async function verifyProjectAccess(
    db: DrizzleDb,
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

    if (!project) {
        throw new Error('Project not found');
    }

    if (project.userProjects.length === 0) {
        throw new Error('Unauthorized: You do not have access to this project');
    }
}
