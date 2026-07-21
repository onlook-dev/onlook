import { eq, inArray } from "drizzle-orm";
import {
    branches,
    canvases,
    conversations,
    customDomainVerification,
    deployments,
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
    // Dedupe: `inArray` returns one row per distinct id, so comparing against
    // the raw (possibly-duplicated) input length would falsely reject a caller
    // who passed the same id twice. Compare against the distinct-id count.
    const uniqueIds = [...new Set(messageIds)];
    const rows = await db.query.messages.findMany({
        where: inArray(messages.id, uniqueIds),
        with: { conversation: true },
    });
    if (rows.length !== uniqueIds.length) {
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

/**
 * Verifies that a user may operate on a sandbox.
 *
 * A sandbox is owned once it is tied to a project — via a `branches.sandboxId`
 * row (primary link) or the project's own `projects.sandboxId` (fallback). When
 * it is, the caller must be a member of that project. A sandbox that resolves to
 * NO project is a transient/unclaimed one (a freshly created, forked-from-
 * template, or just-imported sandbox that has not been persisted to a branch
 * yet) — there is no owner to violate, so it is allowed. This is deliberate: the
 * blank-project / local-import / fork flows create a brand-new sandbox and call
 * `start`/`fork` on it BEFORE any branch row exists, so a strict "deny when no
 * branch" check would break legitimate project creation. The IDOR this closes is
 * acting on ANOTHER user's *persisted* project sandbox by id.
 * @throws Error if the sandbox belongs to a project the user is not a member of
 */
export async function verifySandboxAccess(
    db: DbOrTx,
    userId: string,
    sandboxId: string,
): Promise<void> {
    const branch = await db.query.branches.findFirst({
        where: eq(branches.sandboxId, sandboxId),
    });
    if (branch) {
        await verifyProjectAccess(db, userId, branch.projectId);
        return;
    }
    const project = await db.query.projects.findFirst({
        where: eq(projects.sandboxId, sandboxId),
    });
    if (project) {
        await verifyProjectAccess(db, userId, project.id);
        return;
    }
    // No owning project — transient/unclaimed sandbox, nothing to authorize.
}

/**
 * Returns the set of sandbox ids the user may see — every sandbox tied to a
 * project they're a member of, via `branches.sandboxId` plus the project's own
 * `projects.sandboxId`. Used to scope `sandbox.list`, whose underlying provider
 * call returns the whole account's sandboxes (a cross-tenant inventory leak) and
 * cannot be narrowed by the input id alone.
 */
export async function listAccessibleSandboxIds(
    db: DbOrTx,
    userId: string,
): Promise<Set<string>> {
    const memberships = await db.query.userProjects.findMany({
        where: eq(userProjects.userId, userId),
    });
    const projectIds = memberships.map((m) => m.projectId);
    if (projectIds.length === 0) {
        return new Set();
    }
    const [projectRows, branchRows] = await Promise.all([
        db.query.projects.findMany({
            where: inArray(projects.id, projectIds),
        }),
        db.query.branches.findMany({
            where: inArray(branches.projectId, projectIds),
        }),
    ]);
    const ids = new Set<string>();
    for (const p of projectRows) {
        if (p.sandboxId) ids.add(p.sandboxId);
    }
    for (const b of branchRows) {
        if (b.sandboxId) ids.add(b.sandboxId);
    }
    return ids;
}

/**
 * Verifies that a user has access to a deployment via its parent project.
 * @throws Error if the deployment doesn't exist or the user lacks project access
 */
export async function verifyDeploymentAccess(
    db: DbOrTx,
    userId: string,
    deploymentId: string,
): Promise<void> {
    const deployment = await db.query.deployments.findFirst({
        where: eq(deployments.id, deploymentId),
    });
    if (!deployment) {
        throw new Error('Unauthorized or not found');
    }
    await verifyProjectAccess(db, userId, deployment.projectId);
}

/**
 * Verifies that a user has access to a custom-domain verification via its
 * parent project.
 * @throws Error if the verification doesn't exist or the user lacks project access
 */
export async function verifyDomainVerificationAccess(
    db: DbOrTx,
    userId: string,
    verificationId: string,
): Promise<void> {
    const verification = await db.query.customDomainVerification.findFirst({
        where: eq(customDomainVerification.id, verificationId),
    });
    if (!verification) {
        throw new Error('Unauthorized or not found');
    }
    await verifyProjectAccess(db, userId, verification.projectId);
}
