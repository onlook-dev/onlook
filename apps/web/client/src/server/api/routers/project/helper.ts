import { eq, inArray } from "drizzle-orm";
import {
    branches,
    canvases,
    conversations,
    frames,
    messages,
    projectInvitations,
    projects,
    userProjects,
    type DrizzleDb,
    type Frame,
} from "@onlook/db";

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

/**
 * Verifies that a user has access to a conversation via its parent project.
 * @throws Error if the conversation doesn't exist or the user lacks project access
 */
export async function verifyConversationAccess(
    db: DbOrTx,
    userId: string,
    conversationId: string,
): Promise<void> {
    const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
    });
    if (!conversation) {
        throw new Error('Unauthorized or not found');
    }
    await verifyProjectAccess(db, userId, conversation.projectId);
}

/**
 * Verifies that a user has access to every message in `messageIds`, via each
 * message's parent conversation -> project. Used by bulk operations (e.g.
 * message.delete) that accept an array of ids potentially spanning multiple
 * conversations/projects.
 * @throws Error if any message doesn't exist or resolves to an inaccessible project
 */
export async function verifyMessagesAccess(
    db: DbOrTx,
    userId: string,
    messageIds: string[],
): Promise<void> {
    if (messageIds.length === 0) {
        return;
    }
    const rows = await db.query.messages.findMany({
        where: inArray(messages.id, messageIds),
        with: { conversation: true },
    });
    if (rows.length !== messageIds.length) {
        throw new Error('Unauthorized or not found');
    }
    const projectIds = new Set(rows.map((row) => row.conversation.projectId));
    for (const projectId of projectIds) {
        await verifyProjectAccess(db, userId, projectId);
    }
}

/**
 * Verifies that a user has access to a branch via its parent project.
 * @throws Error if the branch doesn't exist or the user lacks project access
 */
export async function verifyBranchAccess(
    db: DbOrTx,
    userId: string,
    branchId: string,
): Promise<void> {
    const branch = await db.query.branches.findFirst({
        where: eq(branches.id, branchId),
    });
    if (!branch) {
        throw new Error('Unauthorized or not found');
    }
    await verifyProjectAccess(db, userId, branch.projectId);
}

/**
 * Verifies that a user has access to a canvas via its parent project.
 * @throws Error if the canvas doesn't exist or the user lacks project access
 */
export async function verifyCanvasAccess(
    db: DbOrTx,
    userId: string,
    canvasId: string,
): Promise<void> {
    const canvas = await db.query.canvases.findFirst({
        where: eq(canvases.id, canvasId),
    });
    if (!canvas) {
        throw new Error('Unauthorized or not found');
    }
    await verifyProjectAccess(db, userId, canvas.projectId);
}

/**
 * Verifies that a user has access to a frame via its parent canvas -> project.
 * @throws Error if the frame doesn't exist or the user lacks project access
 */
export async function verifyFrameAccess(
    db: DbOrTx,
    userId: string,
    frameId: string,
): Promise<void> {
    const frame = await db.query.frames.findFirst({
        where: eq(frames.id, frameId),
    });
    if (!frame) {
        throw new Error('Unauthorized or not found');
    }
    await verifyCanvasAccess(db, userId, frame.canvasId);
}

/**
 * Verifies that a user has access to a project invitation via its parent project.
 * @throws Error if the invitation doesn't exist or the user lacks project access
 */
export async function verifyInvitationAccess(
    db: DbOrTx,
    userId: string,
    invitationId: string,
): Promise<void> {
    const invitation = await db.query.projectInvitations.findFirst({
        where: eq(projectInvitations.id, invitationId),
    });
    if (!invitation) {
        throw new Error('Unauthorized or not found');
    }
    await verifyProjectAccess(db, userId, invitation.projectId);
}
