/**
 * CI Monitoring Service - Phase 5.1
 * Polls GitHub check runs and automatically updates apply run status
 * Triggers OpenHands repair on failure
 */

import { db } from '@onlook/db/src/client';
import { applyRuns } from '@onlook/db/src/schema';
import { eq, sql } from 'drizzle-orm';
import { createInstallationOctokit } from '@onlook/github';
import type { Octokit } from '@octokit/rest';

/**
 * CI Check Status
 */
type CheckStatus = 'queued' | 'in_progress' | 'completed';
type CheckConclusion = 'success' | 'failure' | 'cancelled' | 'timed_out' | 'action_required' | 'neutral' | 'skipped';

interface CheckRunSummary {
    status: CheckStatus;
    conclusion: CheckConclusion | null;
    allCompleted: boolean;
    anyFailures: boolean;
}

/**
 * Monitor GitHub check runs for a PR
 */
export async function monitorChecks(data: {
    applyRunId: string;
    userId: string;
    repoOwner: string;
    repoName: string;
    prNumber: number;
    branch: string;
    githubInstallationId?: string;
    maxAttempts?: number;
    pollInterval?: number; // milliseconds
}): Promise<void> {
    const {
        applyRunId,
        userId,
        repoOwner,
        repoName,
        prNumber,
        branch,
        maxAttempts = 60, // 60 attempts * 20s = 20 minutes max
        pollInterval = 20000, // 20 seconds
    } = data;

    console.log(`[CI Monitor] Starting monitor for apply run ${applyRunId}`);
    console.log(`[CI Monitor] PR #${prNumber} in ${repoOwner}/${repoName}`);
    console.log(`[CI Monitor] Max poll time: ${(maxAttempts * pollInterval) / 60000} minutes`);

    // Create GitHub client
    const installationId = data.githubInstallationId || process.env.GITHUB_INSTALLATION_ID;
    if (!installationId) {
        throw new Error('GitHub installation ID not configured');
    }

    const octokit = createInstallationOctokit(installationId);

    let attempts = 0;
    let repairTriggered = false;

    while (attempts < maxAttempts) {
        attempts++;

        try {
            // Get PR head SHA
            const { data: pr } = await octokit.pulls.get({
                owner: repoOwner,
                repo: repoName,
                pull_number: prNumber,
            });

            const headSha = pr.head.sha;

            // Get check runs for this commit
            const { data: checkRuns } = await octokit.checks.listForRef({
                owner: repoOwner,
                repo: repoName,
                ref: headSha,
            });

            const summary = summarizeCheckRuns(checkRuns.check_runs);

            console.log(
                `[CI Monitor] Attempt ${attempts}/${maxAttempts}: ` +
                `status=${summary.status}, ` +
                `completed=${summary.allCompleted}, ` +
                `failures=${summary.anyFailures}`
            );

            // If all checks completed
            if (summary.allCompleted) {
                if (summary.anyFailures) {
                    // FAILURE PATH
                    console.log(`[CI Monitor] CI checks FAILED for PR #${prNumber}`);

                    // Update apply run to failed
                    await updateApplyRunStatus(
                        applyRunId,
                        userId,
                        'failed',
                        null,
                        'CI checks failed'
                    );

                    // Trigger repair if not already triggered
                    if (!repairTriggered) {
                        console.log(`[CI Monitor] Triggering automatic repair...`);
                        await triggerRepair(octokit, repoOwner, repoName, prNumber);
                        repairTriggered = true;

                        // Continue monitoring for one more round after repair
                        console.log(`[CI Monitor] Continuing to monitor post-repair...`);
                        await sleep(pollInterval);
                        continue;
                    } else {
                        // Repair already triggered, stop monitoring
                        console.log(`[CI Monitor] Repair already triggered, stopping monitor`);
                        return;
                    }
                } else {
                    // SUCCESS PATH
                    console.log(`[CI Monitor] CI checks PASSED for PR #${prNumber} ✅`);

                    // Update apply run to success
                    await updateApplyRunStatus(
                        applyRunId,
                        userId,
                        'success',
                        null,
                        null
                    );

                    console.log(`[CI Monitor] Apply run marked as success`);
                    return;
                }
            }

            // Checks still running, wait and retry
            await sleep(pollInterval);
        } catch (error: any) {
            console.error(`[CI Monitor] Error on attempt ${attempts}:`, error.message);

            // If we've exhausted retries, mark as failed
            if (attempts >= maxAttempts) {
                await updateApplyRunStatus(
                    applyRunId,
                    userId,
                    'failed',
                    null,
                    `CI monitoring timed out after ${maxAttempts} attempts`
                );
                throw error;
            }

            // Otherwise, retry
            await sleep(pollInterval);
        }
    }

    // Timeout - mark as failed
    console.log(`[CI Monitor] Timeout: CI checks did not complete within max time`);
    await updateApplyRunStatus(
        applyRunId,
        userId,
        'failed',
        null,
        'CI monitoring timed out - checks did not complete'
    );
}

/**
 * Summarize check run statuses
 */
function summarizeCheckRuns(checkRuns: any[]): CheckRunSummary {
    if (checkRuns.length === 0) {
        // No checks yet - consider as "not completed"
        return {
            status: 'queued',
            conclusion: null,
            allCompleted: false,
            anyFailures: false,
        };
    }

    let allCompleted = true;
    let anyFailures = false;

    for (const check of checkRuns) {
        if (check.status !== 'completed') {
            allCompleted = false;
        }

        if (
            check.conclusion === 'failure' ||
            check.conclusion === 'timed_out' ||
            check.conclusion === 'action_required'
        ) {
            anyFailures = true;
        }
    }

    return {
        status: allCompleted ? 'completed' : 'in_progress',
        conclusion: allCompleted
            ? anyFailures
                ? 'failure'
                : 'success'
            : null,
        allCompleted,
        anyFailures,
    };
}

/**
 * Trigger OpenHands repair by applying label
 */
async function triggerRepair(
    octokit: Octokit,
    owner: string,
    repo: string,
    prNumber: number
): Promise<void> {
    console.log(`[CI Monitor] Applying 'agent:repair' label to PR #${prNumber}`);

    try {
        // Check if label already exists
        const { data: labels } = await octokit.issues.listLabelsOnIssue({
            owner,
            repo,
            issue_number: prNumber,
        });

        const hasRepairLabel = labels.some((label) => label.name === 'agent:repair');

        if (hasRepairLabel) {
            console.log(`[CI Monitor] Label 'agent:repair' already present, skipping`);
            return;
        }

        // Add label
        await octokit.issues.addLabels({
            owner,
            repo,
            issue_number: prNumber,
            labels: ['agent:repair'],
        });

        console.log(`[CI Monitor] Label 'agent:repair' applied successfully ✅`);
    } catch (error: any) {
        console.error(`[CI Monitor] Failed to apply label:`, error.message);
        // Don't throw - label application failure shouldn't break monitoring
    }
}

/**
 * Update apply run status
 */
async function updateApplyRunStatus(
    applyRunId: string,
    userId: string,
    status: string,
    branch: string | null,
    error: string | null
): Promise<void> {
    await db.execute(sql`
        SELECT * FROM update_apply_run_status(
            ${applyRunId}::uuid,
            ${userId}::uuid,
            ${status}::apply_run_status,
            ${branch}::text,
            NULL::int,
            NULL::text,
            NULL::jsonb,
            ${error}::text
        )
    `);
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
