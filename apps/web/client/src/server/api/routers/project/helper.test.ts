import { describe, expect, it } from 'bun:test';
import {
    listAccessibleSandboxIds,
    verifyBranchAccess,
    verifyConversationAccess,
    verifyDeploymentAccess,
    verifyDomainVerificationAccess,
    verifyFrameAccess,
    verifyMessagesAccess,
    verifyProjectAccess,
    verifySandboxAccess,
} from './helper';

// The verify* helpers only touch `db.query.<table>.findFirst/findMany`. We stub
// that surface — the drizzle `where`/`with` expressions the helpers build are
// real but inert against the stub, so each test just declares what a given
// table lookup returns. `userProjects` on a found project models membership.

const MEMBER = 'user-1';
const OUTSIDER = 'user-2';

type TableStub = {
    findFirst?: (args?: unknown) => unknown;
    findMany?: (args?: unknown) => unknown;
};

function makeDb(tables: Record<string, TableStub>) {
    const query = new Proxy({} as Record<string, TableStub>, {
        get(_t, name: string) {
            return (
                tables[name] ?? {
                    findFirst: async () => undefined,
                    findMany: async () => [],
                }
            );
        },
    });
    return { query } as never;
}

describe('verifyProjectAccess', () => {
    const db = (projectId: string, members: string[]) =>
        makeDb({
            projects: {
                findFirst: async () => ({
                    id: projectId,
                    userProjects: members.includes(MEMBER) ? [{ userId: MEMBER }] : [],
                }),
            },
        });

    it('resolves for a project member', async () => {
        await expect(verifyProjectAccess(db('p1', [MEMBER]), MEMBER, 'p1')).resolves.toBeUndefined();
    });

    it('rejects a non-member', async () => {
        await expect(verifyProjectAccess(db('p1', [OUTSIDER]), MEMBER, 'p1')).rejects.toThrow(
            'Unauthorized or not found',
        );
    });

    it('rejects when the project does not exist (same message, no enumeration)', async () => {
        const missing = makeDb({ projects: { findFirst: async () => undefined } });
        await expect(verifyProjectAccess(missing, MEMBER, 'nope')).rejects.toThrow(
            'Unauthorized or not found',
        );
    });
});

describe('verifyConversationAccess', () => {
    it('rejects when the conversation is missing', async () => {
        const db = makeDb({ conversations: { findFirst: async () => undefined } });
        await expect(verifyConversationAccess(db, MEMBER, 'c1')).rejects.toThrow(
            'Unauthorized or not found',
        );
    });

    it('delegates to project access (member passes)', async () => {
        const db = makeDb({
            conversations: { findFirst: async () => ({ id: 'c1', projectId: 'p1' }) },
            projects: { findFirst: async () => ({ id: 'p1', userProjects: [{ userId: MEMBER }] }) },
        });
        await expect(verifyConversationAccess(db, MEMBER, 'c1')).resolves.toBeUndefined();
    });

    it('delegates to project access (non-member rejected)', async () => {
        const db = makeDb({
            conversations: { findFirst: async () => ({ id: 'c1', projectId: 'p1' }) },
            projects: { findFirst: async () => ({ id: 'p1', userProjects: [] }) },
        });
        await expect(verifyConversationAccess(db, MEMBER, 'c1')).rejects.toThrow();
    });
});

describe('verifyMessagesAccess', () => {
    const withMessages = (rows: { id: string; projectId: string }[], memberProjects: string[]) =>
        makeDb({
            messages: {
                findMany: async () =>
                    rows.map((r) => ({ id: r.id, conversation: { projectId: r.projectId } })),
            },
            projects: {
                findFirst: async () => ({
                    id: 'p',
                    userProjects: memberProjects.length ? [{ userId: MEMBER }] : [],
                }),
            },
        });

    it('is a no-op for an empty list', async () => {
        await expect(verifyMessagesAccess(makeDb({}), MEMBER, [])).resolves.toBeUndefined();
    });

    it('does NOT falsely reject when the input has duplicate ids (regression)', async () => {
        // Two distinct rows returned for three ids because ['a','a','b'] dedupes
        // to two. The old `rows.length !== messageIds.length` check rejected this.
        const db = withMessages(
            [
                { id: 'a', projectId: 'p1' },
                { id: 'b', projectId: 'p1' },
            ],
            ['p1'],
        );
        await expect(verifyMessagesAccess(db, MEMBER, ['a', 'a', 'b'])).resolves.toBeUndefined();
    });

    it('rejects when a message id does not resolve', async () => {
        const db = withMessages([{ id: 'a', projectId: 'p1' }], ['p1']);
        await expect(verifyMessagesAccess(db, MEMBER, ['a', 'missing'])).rejects.toThrow(
            'Unauthorized or not found',
        );
    });
});

describe('verifyBranchAccess / verifyFrameAccess', () => {
    it('branch: rejects when missing', async () => {
        const db = makeDb({ branches: { findFirst: async () => undefined } });
        await expect(verifyBranchAccess(db, MEMBER, 'b1')).rejects.toThrow(
            'Unauthorized or not found',
        );
    });

    it('frame: resolves frame -> canvas -> project for a member', async () => {
        const db = makeDb({
            frames: { findFirst: async () => ({ id: 'f1', canvasId: 'cv1' }) },
            canvases: { findFirst: async () => ({ id: 'cv1', projectId: 'p1' }) },
            projects: { findFirst: async () => ({ id: 'p1', userProjects: [{ userId: MEMBER }] }) },
        });
        await expect(verifyFrameAccess(db, MEMBER, 'f1')).resolves.toBeUndefined();
    });
});

describe('verifySandboxAccess', () => {
    it('passes when the sandbox belongs to a project the user is a member of (via branch)', async () => {
        const db = makeDb({
            branches: { findFirst: async () => ({ sandboxId: 's1', projectId: 'p1' }) },
            projects: { findFirst: async () => ({ id: 'p1', userProjects: [{ userId: MEMBER }] }) },
        });
        await expect(verifySandboxAccess(db, MEMBER, 's1')).resolves.toBeUndefined();
    });

    it('rejects a sandbox that belongs to another user\'s project', async () => {
        const db = makeDb({
            branches: { findFirst: async () => ({ sandboxId: 's1', projectId: 'p1' }) },
            projects: { findFirst: async () => ({ id: 'p1', userProjects: [] }) },
        });
        await expect(verifySandboxAccess(db, MEMBER, 's1')).rejects.toThrow(
            'Unauthorized or not found',
        );
    });

    it('falls back to projects.sandboxId when there is no branch row', async () => {
        const db = makeDb({
            branches: { findFirst: async () => undefined },
            projects: {
                findFirst: async () => ({ id: 'p1', sandboxId: 's1', userProjects: [{ userId: MEMBER }] }),
            },
        });
        await expect(verifySandboxAccess(db, MEMBER, 's1')).resolves.toBeUndefined();
    });

    it('allows an unowned/transient sandbox (fresh create/fork/import, no project yet)', async () => {
        const db = makeDb({
            branches: { findFirst: async () => undefined },
            projects: { findFirst: async () => undefined },
        });
        await expect(verifySandboxAccess(db, MEMBER, 'fresh')).resolves.toBeUndefined();
    });
});

describe('verifyDeploymentAccess / verifyDomainVerificationAccess', () => {
    it('deployment: delegates to its project', async () => {
        const ok = makeDb({
            deployments: { findFirst: async () => ({ id: 'd1', projectId: 'p1' }) },
            projects: { findFirst: async () => ({ id: 'p1', userProjects: [{ userId: MEMBER }] }) },
        });
        await expect(verifyDeploymentAccess(ok, MEMBER, 'd1')).resolves.toBeUndefined();

        const missing = makeDb({ deployments: { findFirst: async () => undefined } });
        await expect(verifyDeploymentAccess(missing, MEMBER, 'd1')).rejects.toThrow(
            'Unauthorized or not found',
        );
    });

    it('domain verification: rejects a non-member', async () => {
        const db = makeDb({
            customDomainVerification: { findFirst: async () => ({ id: 'v1', projectId: 'p1' }) },
            projects: { findFirst: async () => ({ id: 'p1', userProjects: [] }) },
        });
        await expect(verifyDomainVerificationAccess(db, MEMBER, 'v1')).rejects.toThrow();
    });
});

describe('listAccessibleSandboxIds', () => {
    it('returns the union of branch + project sandbox ids for the user\'s projects', async () => {
        const db = makeDb({
            userProjects: { findMany: async () => [{ projectId: 'p1' }, { projectId: 'p2' }] },
            projects: {
                findMany: async () => [
                    { id: 'p1', sandboxId: 'proj-sb-1' },
                    { id: 'p2', sandboxId: null },
                ],
            },
            branches: {
                findMany: async () => [
                    { projectId: 'p1', sandboxId: 'branch-sb-1' },
                    { projectId: 'p2', sandboxId: 'branch-sb-2' },
                ],
            },
        });
        const ids = await listAccessibleSandboxIds(db, MEMBER);
        expect([...ids].sort()).toEqual(['branch-sb-1', 'branch-sb-2', 'proj-sb-1']);
    });

    it('returns an empty set when the user has no memberships', async () => {
        const db = makeDb({ userProjects: { findMany: async () => [] } });
        const ids = await listAccessibleSandboxIds(db, MEMBER);
        expect(ids.size).toBe(0);
    });
});
