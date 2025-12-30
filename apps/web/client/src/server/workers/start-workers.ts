/**
 * Worker Process Entrypoint - Phase 5.1
 * Starts BullMQ workers as a dedicated process (separate from Next.js)
 *
 * Usage:
 *   bun run workers
 */

import { initializeApplyWorker } from '../api/workers/apply-worker';
import { initializeMonitorWorker } from '../api/workers/monitor-worker';
import { checkQueueHealth } from '../api/services/queue-service';

console.log('🚀 [Workers] Starting Cynthia worker processes...');

// Check Redis connection
async function healthCheck() {
    console.log('🔍 [Workers] Checking Redis connection...');
    const healthy = await checkQueueHealth();

    if (!healthy) {
        console.error('❌ [Workers] Redis connection failed!');
        console.error('💡 [Workers] Make sure Redis is running:');
        console.error('   docker run -d -p 6379:6379 redis:7-alpine');
        process.exit(1);
    }

    console.log('✅ [Workers] Redis connection OK');
}

// Initialize workers
async function startWorkers() {
    await healthCheck();

    console.log('🔧 [Workers] Initializing workers...');
    const applyWorker = initializeApplyWorker();
    const monitorWorker = initializeMonitorWorker();

    console.log('✅ [Workers] All workers started successfully');
    console.log('');
    console.log('📊 [Workers] Configuration:');
    console.log('   - Apply Worker: 2 concurrent jobs, 3 retries');
    console.log('   - Monitor Worker: 3 concurrent jobs, 20min timeout');
    console.log('');
    console.log('👀 [Workers] Watching queues:');
    console.log('   - cynthia-apply (PR creation)');
    console.log('   - cynthia-monitor (CI polling)');
    console.log('');
    console.log('🟢 Status: READY');
    console.log('');
    console.log('Press Ctrl+C to stop workers');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('');
        console.log('🛑 [Workers] Received SIGINT, shutting down gracefully...');

        await applyWorker.close();
        await monitorWorker.close();

        console.log('✅ [Workers] Workers stopped');
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('');
        console.log('🛑 [Workers] Received SIGTERM, shutting down gracefully...');

        await applyWorker.close();
        await monitorWorker.close();

        console.log('✅ [Workers] Workers stopped');
        process.exit(0);
    });
}

// Start
startWorkers().catch((error) => {
    console.error('❌ [Workers] Fatal error:', error);
    process.exit(1);
});
