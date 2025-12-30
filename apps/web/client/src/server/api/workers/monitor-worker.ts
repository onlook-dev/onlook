/**
 * Monitor Worker - BullMQ job processor for CI check monitoring
 * Phase 5.1: Automatic CI status resolution
 */

import type { Job } from 'bullmq';
import {
    startMonitorWorker,
    type MonitorChecksJobData,
} from '../services/queue-service';
import { monitorChecks } from '../services/ci-monitoring-service';

/**
 * Process monitor checks job
 */
async function processMonitorJob(job: Job<MonitorChecksJobData>): Promise<void> {
    console.log(`[Monitor Worker] Processing job ${job.id}`);

    const { applyRunId, userId, repoOwner, repoName, prNumber, branch, githubInstallationId } = job.data;

    // Validate job data
    if (!applyRunId || !userId || !repoOwner || !repoName || !prNumber || !branch) {
        throw new Error('Missing required job data');
    }

    // Update job progress
    await job.updateProgress(10);

    // Run the CI monitoring service
    await monitorChecks({
        applyRunId,
        userId,
        repoOwner,
        repoName,
        prNumber,
        branch,
        githubInstallationId,
    });

    // Mark job complete
    await job.updateProgress(100);
    console.log(`[Monitor Worker] Job ${job.id} completed`);
}

/**
 * Start the monitor worker
 * Call this during server initialization
 */
export function initializeMonitorWorker() {
    console.log('[Monitor Worker] Starting monitor worker...');
    const worker = startMonitorWorker(processMonitorJob);
    console.log('[Monitor Worker] Worker started successfully');
    return worker;
}
