/**
 * Build Session Processor - Wires build sessions to Cynthia audits
 * Phase 3: Real audit integration
 */

import { db } from '@onlook/db/src/client';
import { audits, buildSessions } from '@onlook/db/src/schema';
import { AuditStatus } from '@onlook/models';
import { eq } from 'drizzle-orm';
import { processAudit } from './processor';

/**
 * System constants for anonymous build sessions
 * These should be created in the database as part of setup
 * For now, we'll use placeholder UUIDs
 * TODO: Create proper system project and user in database setup
 */
const SYSTEM_BUILD_PROJECT_ID = '00000000-0000-0000-0000-000000000001'; // "Build My Site" system project
const SYSTEM_BUILD_USER_ID = '00000000-0000-0000-0000-000000000002'; // System user for anonymous builds

/**
 * Derive teaser data from completed audit
 */
function deriveTeaserFromAudit(audit: {
    overallScore: number | null;
    issuesFoundTotal: number | null;
    teaserIssues: unknown;
}) {
    return {
        teaserScore: audit.overallScore ?? 0,
        teaserSummary: {
            issuesFound: audit.issuesFoundTotal ?? 0,
            teaserIssues: audit.teaserIssues ?? [],
        },
    };
}

/**
 * Process a build session audit in the background
 * Wraps the existing audit processor with build session updates
 */
export async function processBuildSessionAudit(buildSessionId: string) {
    try {
        // Get build session
        const [buildSession] = await db
            .select()
            .from(buildSessions)
            .where(eq(buildSessions.id, buildSessionId))
            .limit(1);

        if (!buildSession) {
            throw new Error(`Build session ${buildSessionId} not found`);
        }

        if (!buildSession.auditId) {
            throw new Error(`Build session ${buildSessionId} has no audit ID`);
        }

        // Update audit status to RUNNING
        await db
            .update(buildSessions)
            .set({
                auditStatus: 'running',
                updatedAt: new Date(),
            })
            .where(eq(buildSessions.id, buildSessionId));

        // Process the audit using existing processor
        const result = await processAudit(buildSession.auditId);

        if (result.success) {
            // Get completed audit results
            const [audit] = await db
                .select({
                    overallScore: audits.overallScore,
                    issuesFoundTotal: audits.issuesFoundTotal,
                    teaserIssues: audits.teaserIssues,
                })
                .from(audits)
                .where(eq(audits.id, buildSession.auditId))
                .limit(1);

            if (audit) {
                // Derive teaser from real audit
                const teaser = deriveTeaserFromAudit(audit);

                // Update build session with real teaser data
                await db
                    .update(buildSessions)
                    .set({
                        auditStatus: 'completed',
                        teaserScore: teaser.teaserScore,
                        teaserSummary: teaser.teaserSummary,
                        updatedAt: new Date(),
                    })
                    .where(eq(buildSessions.id, buildSessionId));
            }
        } else {
            // Mark as failed
            await db
                .update(buildSessions)
                .set({
                    auditStatus: 'failed',
                    updatedAt: new Date(),
                })
                .where(eq(buildSessions.id, buildSessionId));
        }

        return { success: true, buildSessionId };
    } catch (error) {
        console.error(`Build session audit ${buildSessionId} failed:`, error);

        // Update status to FAILED
        await db
            .update(buildSessions)
            .set({
                auditStatus: 'failed',
                updatedAt: new Date(),
            })
            .where(eq(buildSessions.id, buildSessionId));

        return {
            success: false,
            buildSessionId,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Start build session audit processing
 * Creates audit and queues background job
 */
export async function startBuildSessionAudit(params: {
    buildSessionId: string;
    inputType: 'url' | 'idea';
    inputValue: string;
    userId: string | null;
}) {
    const { buildSessionId, inputType, inputValue, userId } = params;

    // Determine target type for audit
    // For Phase 3, URL inputs go directly to audit, ideas are converted to URL (stub)
    const targetType = inputType === 'url' ? 'url' : 'url'; // TODO: Convert ideas to URLs in Phase 4
    const targetValue = inputType === 'url' ? inputValue : `https://example.com`; // Stub for idea conversion

    // Create audit
    const [audit] = await db
        .insert(audits)
        .values({
            projectId: SYSTEM_BUILD_PROJECT_ID,
            userId: userId || SYSTEM_BUILD_USER_ID, // Use system user for anonymous
            targetType,
            targetValue,
            status: AuditStatus.PENDING,
            context: {
                source: 'build-my-site',
                inputType,
                originalInput: inputValue,
            },
        })
        .returning();

    if (!audit) {
        throw new Error('Failed to create audit');
    }

    // Link audit to build session
    await db
        .update(buildSessions)
        .set({
            auditId: audit.id,
            auditStatus: 'pending',
            updatedAt: new Date(),
        })
        .where(eq(buildSessions.id, buildSessionId));

    // Queue background processing (non-blocking)
    setTimeout(async () => {
        await processBuildSessionAudit(buildSessionId);
    }, 0);

    return { queued: true, auditId: audit.id };
}
