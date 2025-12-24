# Migration Scripts

This directory contains migration scripts for transitioning the database schema to support new features.

## Branch Migration

### Overview

The `migrate-to-branching.ts` script migrates existing projects from the legacy schema to the new branching structure introduced in PR #2763.

### Schema Changes

**Before (Legacy):**
- Projects had `sandboxId` and `sandboxUrl` fields
- Frames directly referenced canvases with a `type` field (using FrameType enum)
- No branching concept

**After (New Schema):**
- Projects no longer store `sandboxId` and `sandboxUrl` (moved to branches)
- New `branches` table with default branch per project
- Frames now require a `branchId` reference
- `FrameType` enum removed from frames

### What the Migration Does

1. **Creates default branches**: For each existing project, creates a "main" branch with `isDefault: true`
2. **Migrates sandbox data**: Moves `sandboxId` from projects to the default branch (generates new UUID if null)
3. **Updates frame references**: All existing frames are updated to reference the project's default branch
4. **Handles orphaned data**: Ensures no frames are left without valid branch references
5. **Validation**: Verifies migration completeness

### Running the Migration

#### Prerequisites
- Database URL must be set in `SUPABASE_DATABASE_URL` environment variable (should be in root .env file)
- Database should be backed up before running

#### From packages/db directory:
```bash
cd packages/db
bun run db:migrate:branching
```

#### Direct execution:
```bash
cd packages/db/src/migration-scripts
bun run migrate-to-branching.ts
```

#### Programmatic Usage
```typescript
import { migrateToBranching } from '@onlook/db/src/migration-scripts/migrate-to-branching';

await migrateToBranching();
```

### Migration Output
The script provides detailed logging:
- Projects found and migrated
- Branches created
- Frames updated
- Orphaned data cleaned up
- Final verification counts

### Safety Features
- **Idempotent**: Can be run multiple times safely
- **Validation**: Ensures all frames have branch references after migration
- **Error handling**: Rolls back on failure
- **Logging**: Comprehensive output for monitoring progress

### Post-Migration Verification

After running the migration, verify:
```sql
-- Should return 0
SELECT COUNT(*) FROM frames WHERE branch_id IS NULL;

-- Should have at least one default branch per project
SELECT 
    p.id as project_id, 
    p.name,
    b.id as branch_id,
    b.name as branch_name,
    b.is_default
FROM projects p
LEFT JOIN branches b ON p.id = b.project_id AND b.is_default = true;
```

### Rollback (if needed)

If you need to rollback (not recommended after schema changes are deployed):
1. Remove all entries from `branches` table
2. Re-add `sandboxId` and `sandboxUrl` columns to projects table
3. Remove `branchId` column from frames table
4. Re-add `type` column to frames table

⚠️ **Important**: This migration should be run **before** deploying the new schema that removes the deprecated columns.