/**
 * Queue Service - Durable job queues for Phase 5
 * Uses BullMQ + Redis for persistent background jobs
 */

import { Queue, Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';

// Redis connection configuration
const redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
};

// Create Redis client for queues
const redisClient = new Redis(redisConnection);

/**
 * Apply Fix Pack Job Data
 */
export interface ApplyFixPackJobData {
    applyRunId: string;
    userId: string;
    auditId: string;
    fixPackId: string;
    repoOwner: string;
    repoName: string;
}

/**
 * Repair Job Data
 */
export interface RepairJobData {
    applyRunId: string;
    userId: string;
    prNumber: number;
    repoOwner: string;
    repoName: string;
    branch: string;
}

/**
 * Monitor Checks Job Data (Phase 5.1)
 */
export interface MonitorChecksJobData {
    applyRunId: string;
    userId: string;
    repoOwner: string;
    repoName: string;
    prNumber: number;
    branch: string;
    githubInstallationId?: string;
}

/**
 * Apply Queue - Handles fix pack application to GitHub
 */
export const applyQueue = new Queue<ApplyFixPackJobData>('cynthia-apply', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 seconds
        },
        removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
    },
});

/**
 * Repair Queue - Handles OpenHands repair loop
 */
export const repairQueue = new Queue<RepairJobData>('cynthia-repair', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 2, // Retry failed repairs once
        backoff: {
            type: 'exponential',
            delay: 5000, // Start with 5 seconds
        },
        removeOnComplete: {
            age: 24 * 3600,
            count: 50,
        },
        removeOnFail: {
            age: 7 * 24 * 3600,
        },
    },
});

/**
 * Monitor Queue - Handles CI check monitoring (Phase 5.1)
 */
export const monitorQueue = new Queue<MonitorChecksJobData>('cynthia-monitor', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 1, // No retries - monitoring runs continuously internally
        removeOnComplete: {
            age: 24 * 3600,
            count: 100,
        },
        removeOnFail: {
            age: 7 * 24 * 3600,
        },
    },
});

/**
 * Apply Worker - Processes fix pack applications
 * Concurrency: 2 (can process 2 applies simultaneously)
 */
let applyWorker: Worker<ApplyFixPackJobData> | null = null;

export function startApplyWorker(
    processor: (job: Job<ApplyFixPackJobData>) => Promise<void>
) {
    if (applyWorker) {
        return applyWorker; // Already started
    }

    applyWorker = new Worker<ApplyFixPackJobData>(
        'cynthia-apply',
        processor,
        {
            connection: redisConnection,
            concurrency: 2, // Phase 5 spec: start with 2
            lockDuration: 300000, // 5 minutes (apply can take time)
        }
    );

    applyWorker.on('completed', (job) => {
        console.log(`[Apply Worker] Job ${job.id} completed`);
    });

    applyWorker.on('failed', (job, err) => {
        console.error(`[Apply Worker] Job ${job?.id} failed:`, err);
    });

    return applyWorker;
}

/**
 * Repair Worker - Processes OpenHands repair jobs
 * Concurrency: 2
 */
let repairWorker: Worker<RepairJobData> | null = null;

export function startRepairWorker(
    processor: (job: Job<RepairJobData>) => Promise<void>
) {
    if (repairWorker) {
        return repairWorker; // Already started
    }

    repairWorker = new Worker<RepairJobData>(
        'cynthia-repair',
        processor,
        {
            connection: redisConnection,
            concurrency: 2,
            lockDuration: 600000, // 10 minutes (repair can be slow)
        }
    );

    repairWorker.on('completed', (job) => {
        console.log(`[Repair Worker] Job ${job.id} completed`);
    });

    repairWorker.on('failed', (job, err) => {
        console.error(`[Repair Worker] Job ${job?.id} failed:`, err);
    });

    return repairWorker;
}

/**
 * Monitor Worker - Processes CI check monitoring jobs (Phase 5.1)
 * Concurrency: 3 (can monitor multiple PRs simultaneously)
 */
let monitorWorker: Worker<MonitorChecksJobData> | null = null;

export function startMonitorWorker(
    processor: (job: Job<MonitorChecksJobData>) => Promise<void>
) {
    if (monitorWorker) {
        return monitorWorker; // Already started
    }

    monitorWorker = new Worker<MonitorChecksJobData>(
        'cynthia-monitor',
        processor,
        {
            connection: redisConnection,
            concurrency: 3, // Can monitor 3 PRs at once
            lockDuration: 1200000, // 20 minutes (max monitor time)
        }
    );

    monitorWorker.on('completed', (job) => {
        console.log(`[Monitor Worker] Job ${job.id} completed`);
    });

    monitorWorker.on('failed', (job, err) => {
        console.error(`[Monitor Worker] Job ${job?.id} failed:`, err);
    });

    return monitorWorker;
}

/**
 * Queue an apply fix pack job
 * Includes idempotency: deduplicates by applyRunId
 */
export async function queueApplyFixPack(data: ApplyFixPackJobData): Promise<string> {
    const job = await applyQueue.add('apply-fix-pack', data, {
        jobId: `apply-${data.applyRunId}`, // Idempotency key
        removeOnComplete: true,
        removeOnFail: false,
    });

    return job.id || '';
}

/**
 * Queue a repair job
 * Includes idempotency: deduplicates by applyRunId
 */
export async function queueRepair(data: RepairJobData): Promise<string> {
    const job = await repairQueue.add('repair', data, {
        jobId: `repair-${data.applyRunId}`, // Idempotency key
        removeOnComplete: true,
        removeOnFail: false,
    });

    return job.id || '';
}

/**
 * Queue a CI monitoring job (Phase 5.1)
 * Includes idempotency: deduplicates by applyRunId
 */
export async function queueMonitorChecks(data: MonitorChecksJobData): Promise<string> {
    const job = await monitorQueue.add('monitor-checks', data, {
        jobId: `monitor-${data.applyRunId}`, // Idempotency key
        removeOnComplete: true,
        removeOnFail: false,
    });

    return job.id || '';
}

/**
 * Graceful shutdown
 */
export async function closeQueues() {
    await applyWorker?.close();
    await repairWorker?.close();
    await monitorWorker?.close();
    await applyQueue.close();
    await repairQueue.close();
    await monitorQueue.close();
    await redisClient.quit();
}

/**
 * Health check - verify Redis connection
 */
export async function checkQueueHealth(): Promise<boolean> {
    try {
        const pong = await redisClient.ping();
        return pong === 'PONG';
    } catch (error) {
        console.error('[Queue Health] Redis connection failed:', error);
        return false;
    }
}
