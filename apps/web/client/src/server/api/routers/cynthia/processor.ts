/**
 * Audit Processor - Handles background audit execution
 */

import { runAudit } from '@onlook/ai';
import { audits } from '@onlook/db/src/schema';
import { AuditStatus, type AuditInput } from '@onlook/models';
import { db } from '@onlook/db/src/client';
import { eq } from 'drizzle-orm';

/**
 * Process an audit in the background
 * This would typically be called by a job queue (e.g., BullMQ, Inngest)
 * For now, we'll call it directly but it's designed to be async
 */
export async function processAudit(auditId: string) {
    try {
        // Get audit from database
        const [audit] = await db
            .select()
            .from(audits)
            .where(eq(audits.id, auditId))
            .limit(1);

        if (!audit) {
            throw new Error(`Audit ${auditId} not found`);
        }

        // Update status to RUNNING
        await db
            .update(audits)
            .set({
                status: AuditStatus.RUNNING,
                updatedAt: new Date(),
            })
            .where(eq(audits.id, auditId));

        // Prepare audit input
        const auditInput: AuditInput = {
            target: {
                type: audit.targetType as 'url' | 'screenshot' | 'frame' | 'component',
                value: audit.targetValue,
            },
            context: audit.context as any,
            constraints: audit.constraints as any,
        };

        // Run the audit
        const results = await runAudit(auditInput);

        // Save results to database
        await db
            .update(audits)
            .set({
                status: AuditStatus.COMPLETED,
                overallScore: results.overallScore,
                udecScores: results.udecScores,
                issuesFoundTotal: results.issuesFoundTotal,
                teaserIssues: results.teaserIssues,
                fullIssues: results.fullIssues,
                fixPacks: results.fixPacks,
                tokenChanges: results.tokenChanges,
                patchPlan: results.patchPlan,
                completedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(audits.id, auditId));

        return { success: true, auditId };
    } catch (error) {
        console.error(`Audit ${auditId} failed:`, error);

        // Update status to FAILED
        await db
            .update(audits)
            .set({
                status: AuditStatus.FAILED,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                updatedAt: new Date(),
            })
            .where(eq(audits.id, auditId));

        return {
            success: false,
            auditId,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Start audit processing
 * In production, this would queue the job instead of running it immediately
 */
export async function startAuditProcessing(auditId: string) {
    // For now, run immediately (non-blocking would be better in production)
    // In production, you'd want to use a job queue like BullMQ or Inngest
    setTimeout(async () => {
        await processAudit(auditId);
    }, 0);

    return { queued: true, auditId };
}
