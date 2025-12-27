/**
 * Apply Worker - BullMQ job processor for fix pack application
 * Phase 5: Connects queue to apply pipeline service
 */

import type { Job } from 'bullmq';
import {
    startApplyWorker,
    type ApplyFixPackJobData,
} from '../services/queue-service';
import { processApplyFixPack } from '../services/apply-pipeline-service';

/**
 * Process apply fix pack job
 */
async function processApplyJob(job: Job<ApplyFixPackJobData>): Promise<void> {
    console.log(`[Apply Worker] Processing job ${job.id}`);

    const { applyRunId, userId, auditId, fixPackId, repoOwner, repoName } = job.data;

    // Validate job data
    if (!applyRunId || !userId || !fixPackId || !repoOwner || !repoName) {
        throw new Error('Missing required job data');
    }

    // Update job progress
    await job.updateProgress(10);

    // Run the apply pipeline
    await processApplyFixPack({
        applyRunId,
        userId,
        auditId,
        fixPackId,
        repoOwner,
        repoName,
    });

    // Mark job complete
    await job.updateProgress(100);
    console.log(`[Apply Worker] Job ${job.id} completed`);
}

/**
 * Start the apply worker
 * Call this during server initialization
 */
export function initializeApplyWorker() {
    console.log('[Apply Worker] Starting apply worker...');
    const worker = startApplyWorker(processApplyJob);
    console.log('[Apply Worker] Worker started successfully');
    return worker;
}
