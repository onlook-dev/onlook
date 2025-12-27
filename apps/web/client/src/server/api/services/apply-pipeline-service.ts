/**
 * Apply Pipeline Service - Phase 5
 * Handles autonomous fix pack application via GitHub PR + OpenHands repair loop
 */

import { db } from '@onlook/db/src/client';
import { applyRuns, fixPacks, audits } from '@onlook/db/src/schema';
import { eq, sql } from 'drizzle-orm';
import { createInstallationOctokit } from '@onlook/github';
import type { Octokit } from '@octokit/rest';

/**
 * Log entry structure
 */
interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
}

/**
 * Apply pipeline state
 */
interface ApplyState {
    applyRunId: string;
    userId: string;
    logs: LogEntry[];
}

/**
 * Add log entry
 */
function addLog(state: ApplyState, level: LogEntry['level'], message: string) {
    state.logs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
    });
    console.log(`[Apply ${state.applyRunId}] [${level}] ${message}`);
}

/**
 * Update apply run status in database
 */
async function updateApplyRunStatus(
    state: ApplyState,
    status: string,
    updates: {
        branch?: string;
        prNumber?: number;
        prUrl?: string;
        error?: string;
    } = {}
) {
    await db.execute(sql`
        SELECT * FROM update_apply_run_status(
            ${state.applyRunId}::uuid,
            ${state.userId}::uuid,
            ${status}::apply_run_status,
            ${updates.branch || null}::text,
            ${updates.prNumber || null}::int,
            ${updates.prUrl || null}::text,
            ${JSON.stringify(state.logs)}::jsonb,
            ${updates.error || null}::text
        )
    `);
}

/**
 * Get default branch for a repository
 */
async function getDefaultBranch(
    octokit: Octokit,
    owner: string,
    repo: string
): Promise<string> {
    const { data } = await octokit.repos.get({
        owner,
        repo,
    });
    return data.default_branch;
}

/**
 * Create a new branch from the default branch
 */
async function createBranch(
    octokit: Octokit,
    owner: string,
    repo: string,
    branchName: string,
    state: ApplyState
): Promise<void> {
    addLog(state, 'info', `Creating branch: ${branchName}`);

    // Get default branch ref
    const defaultBranch = await getDefaultBranch(octokit, owner, repo);
    const { data: ref } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
    });

    // Create new branch
    await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha,
    });

    addLog(state, 'info', `Branch created successfully`);
}

/**
 * Apply patch to a file with safety checks
 */
function applyPatchToFile(
    fileContent: string,
    before: string,
    after: string,
    state: ApplyState
): string {
    // Safety check 1: Verify before substring exists
    if (!fileContent.includes(before)) {
        throw new Error(
            `Safety check failed: 'before' substring not found in file. ` +
            `Expected to find: "${before.substring(0, 50)}..."`
        );
    }

    // Safety check 2: Verify before substring appears exactly once
    const occurrences = fileContent.split(before).length - 1;
    if (occurrences !== 1) {
        throw new Error(
            `Safety check failed: 'before' substring appears ${occurrences} times, expected exactly 1`
        );
    }

    // Apply deterministic replacement
    const patchedContent = fileContent.replace(before, after);

    addLog(state, 'info', `Patch applied successfully (${after.length - before.length} bytes changed)`);

    return patchedContent;
}

/**
 * Apply fix pack patches to repository files
 */
async function applyPatches(
    octokit: Octokit,
    owner: string,
    repo: string,
    branch: string,
    fixPackData: any,
    state: ApplyState
): Promise<string[]> {
    const modifiedFiles: string[] = [];
    const patchPreview = fixPackData.patchPreview || {};
    const diffs = patchPreview.diffs || [];

    addLog(state, 'info', `Applying ${diffs.length} patch(es)`);

    for (const diff of diffs) {
        const filePath = diff.file;
        addLog(state, 'info', `Processing file: ${filePath}`);

        try {
            // Get current file content
            const { data: fileData } = await octokit.repos.getContent({
                owner,
                repo,
                path: filePath,
                ref: branch,
            });

            if (Array.isArray(fileData) || fileData.type !== 'file') {
                throw new Error(`Path ${filePath} is not a file`);
            }

            // Decode content
            const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');

            // Apply patch with safety checks
            const patchedContent = applyPatchToFile(
                currentContent,
                diff.before,
                diff.after,
                state
            );

            // Commit the change
            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: filePath,
                message: `Fix: ${diff.description || 'Apply fix pack patch'}`,
                content: Buffer.from(patchedContent).toString('base64'),
                branch,
                sha: fileData.sha,
            });

            modifiedFiles.push(filePath);
            addLog(state, 'info', `File committed: ${filePath}`);
        } catch (error: any) {
            addLog(state, 'error', `Failed to patch ${filePath}: ${error.message}`);
            throw error;
        }
    }

    return modifiedFiles;
}

/**
 * Create a pull request
 */
async function createPullRequest(
    octokit: Octokit,
    owner: string,
    repo: string,
    branch: string,
    fixPackData: any,
    state: ApplyState
): Promise<{ number: number; url: string }> {
    addLog(state, 'info', 'Creating pull request');

    const defaultBranch = await getDefaultBranch(octokit, owner, repo);

    const title = fixPackData.title || 'Cynthia Fix Pack';
    const body = `
## Cynthia Fix Pack - ${fixPackData.type}

${fixPackData.description || 'Automated fixes from Cynthia audit'}

### Files Changed
${(fixPackData.filesAffected || []).map((f: string) => `- \`${f}\``).join('\n')}

### Issues Fixed
${(fixPackData.issuesFixed || []).map((i: any) => `- ${i.title || i}`).join('\n')}

---
*This PR was automatically generated by [Cynthia](https://onlook.dev) 🤖*
*To repair failed CI checks, add the \`agent:repair\` label*
`;

    const { data: pr } = await octokit.pulls.create({
        owner,
        repo,
        title,
        body,
        head: branch,
        base: defaultBranch,
    });

    addLog(state, 'info', `Pull request created: #${pr.number}`);

    return {
        number: pr.number,
        url: pr.html_url,
    };
}

/**
 * Main apply fix pack pipeline
 */
export async function processApplyFixPack(data: {
    applyRunId: string;
    userId: string;
    auditId: string;
    fixPackId: string;
    repoOwner: string;
    repoName: string;
    githubInstallationId?: string; // Optional: user's GitHub installation ID
}): Promise<void> {
    const state: ApplyState = {
        applyRunId: data.applyRunId,
        userId: data.userId,
        logs: [],
    };

    try {
        addLog(state, 'info', 'Starting apply fix pack pipeline');

        // Update status to running
        await updateApplyRunStatus(state, 'running');

        // Get fix pack data
        const [fixPack] = await db
            .select()
            .from(fixPacks)
            .where(eq(fixPacks.id, data.fixPackId))
            .limit(1);

        if (!fixPack) {
            throw new Error('Fix pack not found');
        }

        addLog(state, 'info', `Fix pack type: ${fixPack.type}`);

        // Create GitHub client
        // Note: In production, you would get the installation ID from user's GitHub connection
        const installationId = data.githubInstallationId || process.env.GITHUB_INSTALLATION_ID;
        if (!installationId) {
            throw new Error('GitHub installation ID not configured');
        }

        const octokit = createInstallationOctokit(installationId);

        // Generate unique branch name
        const timestamp = Date.now();
        const branchName = `cynthia/fix-${fixPack.type}-${timestamp}`;

        // Create branch
        await createBranch(octokit, data.repoOwner, data.repoName, branchName, state);
        await updateApplyRunStatus(state, 'branch_created', { branch: branchName });

        // Apply patches
        const modifiedFiles = await applyPatches(
            octokit,
            data.repoOwner,
            data.repoName,
            branchName,
            fixPack,
            state
        );

        addLog(state, 'info', `Applied patches to ${modifiedFiles.length} file(s)`);

        // Create pull request
        const pr = await createPullRequest(
            octokit,
            data.repoOwner,
            data.repoName,
            branchName,
            fixPack,
            state
        );

        await updateApplyRunStatus(state, 'pr_opened', {
            branch: branchName,
            prNumber: pr.number,
            prUrl: pr.url,
        });

        // Mark fix pack as applied
        await db
            .update(fixPacks)
            .set({ appliedAt: new Date() })
            .where(eq(fixPacks.id, data.fixPackId));

        addLog(state, 'info', 'Apply pipeline completed successfully');

        // Final status: checks_running (will transition to success/failed based on CI)
        await updateApplyRunStatus(state, 'checks_running', {
            branch: branchName,
            prNumber: pr.number,
            prUrl: pr.url,
        });
    } catch (error: any) {
        addLog(state, 'error', `Pipeline failed: ${error.message}`);
        await updateApplyRunStatus(state, 'failed', {
            error: error.message,
        });
        throw error;
    }
}
