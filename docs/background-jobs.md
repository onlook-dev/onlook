# Background Jobs - Phase 4 Implementation

## Current Approach

**Phase 4** continues using `setTimeout(..., 0)` for non-blocking async execution.

### Jobs Currently Implemented

1. **Audit Processing** (`processBuildSessionAudit`)
   - Triggered by: `buildSession.create`
   - Location: `apps/web/client/src/server/api/routers/cynthia/build-session-processor.ts:44`
   - Duration: ~30-60 seconds
   - Failure handling: Sets `auditStatus = 'failed'`

2. **Fix Pack Generation** (`fixPack.generate`)
   - Triggered by: User request via tRPC endpoint
   - Location: `apps/web/client/src/server/api/routers/cynthia/fix-pack.ts:77`
   - Duration: ~5-10 seconds
   - Failure handling: Returns tRPC error

### Limitations of Current Approach

- ❌ No persistence: Jobs lost on server restart
- ❌ No retry logic: Transient failures permanent
- ❌ No rate limiting: Can overwhelm resources
- ❌ No monitoring: No visibility into queue depth
- ❌ No priority: All jobs equal
- ❌ No deduplication: Duplicate requests processed

### Future: Durable Job Queue (Phase 5+)

**Recommended:** BullMQ + Redis

**Why BullMQ:**
- ✅ Persistent jobs (Redis-backed)
- ✅ Automatic retries with exponential backoff
- ✅ Rate limiting and concurrency control
- ✅ Job prioritization
- ✅ Progress tracking
- ✅ Web UI for monitoring (bull-board)
- ✅ Battle-tested at scale

**Alternative:** Inngest
- ✅ Serverless-native
- ✅ Built-in retries and durability
- ✅ Event-driven architecture
- ✅ Web dashboard
- ❌ Third-party dependency (vs self-hosted BullMQ)

## Migration Path (Phase 5)

1. **Install BullMQ**
   ```bash
   bun add bullmq ioredis
   bun add -D @types/ioredis
   ```

2. **Set up Redis**
   - Local dev: Docker container
   - Production: Redis Cloud / Upstash

3. **Create Queue Wrapper**
   ```ts
   // apps/web/client/src/server/api/services/queue.ts
   import { Queue, Worker } from 'bullmq';

   export const auditQueue = new Queue('cynthia-audits', {
     connection: { host: 'localhost', port: 6379 }
   });

   export const auditWorker = new Worker('cynthia-audits', async (job) => {
     await processBuildSessionAudit(job.data.buildSessionId);
   }, {
     connection: { host: 'localhost', port: 6379 },
     concurrency: 5,
   });
   ```

4. **Replace setTimeout Calls**
   ```ts
   // Before (Phase 4):
   setTimeout(async () => {
     await processBuildSessionAudit(buildSessionId);
   }, 0);

   // After (Phase 5):
   await auditQueue.add('process-audit', { buildSessionId });
   ```

5. **Add Monitoring**
   - Install bull-board for web UI
   - Track metrics: queue depth, processing time, failures

## Current Job Invocation Sites

### Audit Processing
**File:** `apps/web/client/src/server/api/routers/cynthia/build-session-processor.ts`
**Line:** 189
```ts
setTimeout(async () => {
    await processBuildSessionAudit(buildSessionId);
}, 0);
```

### Monthly Credit Reset
**File:** `apps/backend/supabase/migrations/2025_12_19_add_credits_and_fix_packs.sql`
**Line:** 123
```sql
CREATE OR REPLACE FUNCTION reset_monthly_credits()
```
**Note:** Requires cron job setup (pg_cron or external scheduler)

## Testing Current Implementation

**Local dev:**
1. Create build session: Watch console for "Running Cynthia Audit"
2. Poll preview page: Audit status updates in real-time
3. Check database: `audit_status` column transitions (pending → running → completed)

**Failure scenarios:**
1. Kill server mid-audit: Job lost (expected in Phase 4)
2. Audit API error: `auditStatus = 'failed'` in database
3. Database connection lost: tRPC error returned to client

## Phase 4 Acceptance Criteria

✅ Jobs execute asynchronously (non-blocking)
✅ Progress tracking via database columns
✅ Failure handling returns user-facing errors
✅ No horizontal scaling required yet
✅ Adequate for MVP load (<100 concurrent audits)

**Defer to Phase 5:**
- BullMQ/Inngest integration
- Job persistence across restarts
- Retry logic
- Rate limiting
- Monitoring dashboard
