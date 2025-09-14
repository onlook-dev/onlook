import { config } from 'dotenv';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../client';
import { createDefaultBranch } from '../defaults/branch';
import type { Branch, Project } from '../schema';
import { branches as branchesTable, canvases, frames, projects } from '../schema';

// Load .env file
config({ path: '../../.env' });

/**
 * Migration script to transition existing projects to the new branching structure
 * 
 * This script:
 * 1. Creates a default branch for each existing project that doesn't have one
 * 2. Migrates sandboxId from projects to the default branch (generates if null)
 * 3. Updates all existing frames to reference the default branch
 * 4. Handles edge cases and validates completeness
 */

interface LegacyProject extends Project {
    sandboxId: string | null;
    sandboxUrl: string | null;
}

// Helper function to chunk array into smaller batches
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

// Utility function to handle database insert with retry logic
async function insertWithConstraintRetry<T>(
    operation: () => Promise<void>,
    entityType: string,
    batchNumber?: number
): Promise<void> {
    try {
        await operation();
    } catch (error: any) {
        if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
            const batchInfo = batchNumber ? ` batch ${batchNumber}` : '';
            console.log(`    └─ ${entityType}${batchInfo} already exist (safe to continue)`);
        } else {
            throw error;
        }
    }
}

// Check current migration status
async function checkMigrationStatus(): Promise<{
    totalProjects: number;
    totalBranches: number;
    framesWithoutBranches: number;
    isCompleted: boolean;
    isPartial: boolean;
}> {
    const totalProjects = await db.select({ count: projects.id }).from(projects);
    const totalBranches = await db.select({ count: branchesTable.id }).from(branchesTable);
    const framesWithoutBranches = await db
        .select({ count: frames.id })
        .from(frames)
        .where(isNull(frames.branchId));

    const isCompleted = totalBranches.length > 0 &&
        totalBranches.length === totalProjects.length &&
        framesWithoutBranches.length === 0;
    const isPartial = totalBranches.length > 0 && !isCompleted;

    return {
        totalProjects: totalProjects.length,
        totalBranches: totalBranches.length,
        framesWithoutBranches: framesWithoutBranches.length,
        isCompleted,
        isPartial
    };
}

// Get projects that need migration
async function getProjectsToMigrate() {
    return await db
        .select()
        .from(projects)
        .leftJoin(branchesTable, eq(projects.id, branchesTable.projectId))
        .where(isNull(branchesTable.id));
}

// Create branch objects for projects
function createBranchesForProjects(projectsToMigrate: Awaited<ReturnType<typeof getProjectsToMigrate>>): Branch[] {
    const newBranches: Branch[] = [];

    for (const { projects: project } of projectsToMigrate) {
        console.log(`🔀 Creating default branch for project: ${project.name} (${project.id})`);

        const legacyProject = project as LegacyProject;
        const sandboxId = legacyProject.sandboxId || uuidv4();

        const defaultBranch = createDefaultBranch({
            projectId: project.id,
            sandboxId,
        });

        newBranches.push(defaultBranch);
    }

    return newBranches;
}

// Insert branches in batches
async function insertBranchesInBatches(branches: Branch[]): Promise<void> {
    if (branches.length === 0) return;

    console.log(`📥 Inserting ${branches.length} default branches...`);

    const branchBatchSize = 500;
    const branchChunks = chunkArray(branches, branchBatchSize);

    for (let i = 0; i < branchChunks.length; i++) {
        const chunk = branchChunks[i];
        if (!chunk) continue;

        console.log(`  └─ Inserting batch ${i + 1}/${branchChunks.length} (${chunk.length} branches)`);

        await insertWithConstraintRetry(
            async () => {
                await db.transaction(async (tx) => {
                    await tx.insert(branchesTable).values(chunk);
                });
            },
            'branches',
            i + 1
        );
    }
}

// Process batch of frame updates in parallel
async function processFrameUpdatesInParallel(
    branchUpdates: { branchId: string; projectId: string }[],
    batchSize: number = 1000
): Promise<void> {
    const updatePromises = branchUpdates.map(async ({ branchId, projectId }) => {
        // Get frame IDs first, then update in bulk - still more efficient than individual queries
        const projectFrames = await db
            .select({ id: frames.id })
            .from(frames)
            .innerJoin(canvases, eq(frames.canvasId, canvases.id))
            .where(
                and(
                    eq(canvases.projectId, projectId),
                    isNull(frames.branchId)
                )
            );

        if (projectFrames.length === 0) {
            return { branchId, projectId, rowsUpdated: 0 };
        }

        const frameIds = projectFrames.map(f => f.id);

        // Single bulk update - much faster than individual queries
        await db.transaction(async (tx) => {
            await tx
                .update(frames)
                .set({ branchId })
                .where(inArray(frames.id, frameIds));
        });

        return { branchId, projectId, rowsUpdated: frameIds.length };
    });

    // Process all branches in parallel for maximum speed
    const results = await Promise.all(updatePromises);

    // Log results
    for (const { branchId, projectId, rowsUpdated } of results) {
        if (rowsUpdated > 0) {
            console.log(`  └─ Updated ${rowsUpdated} frames for project ${projectId}`);
        } else {
            console.log(`  └─ No frames need updating for project ${projectId} (already have branchId)`);
        }
    }
}

// Optimized bulk frame updates using single JOIN query per branch
async function updateFramesForBranches(branches: Branch[]): Promise<void> {
    if (branches.length === 0) return;

    console.log('🔗 Updating frames to reference default branches...');

    // Prepare batch updates - stateless operation
    const branchUpdates = branches.map(branch => ({
        branchId: branch.id,
        projectId: branch.projectId
    }));

    // Process in parallel batches for optimal performance
    const concurrencyLimit = 5; // Limit concurrent transactions
    const batches = chunkArray(branchUpdates, concurrencyLimit);

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (!batch || batch.length === 0) continue;

        console.log(`  Processing batch ${i + 1}/${batches.length} (${batch.length} projects)`);
        await processFrameUpdatesInParallel(batch);
    }
}

// Handle orphaned frames with optimized batch processing
async function fixOrphanedFrames(): Promise<void> {
    console.log('🧹 Checking for orphaned frames...');

    const orphanedFrames = await db
        .select({
            frameId: frames.id,
            canvasId: frames.canvasId,
            projectId: canvases.projectId
        })
        .from(frames)
        .innerJoin(canvases, eq(frames.canvasId, canvases.id))
        .where(isNull(frames.branchId));

    if (orphanedFrames.length === 0) {
        console.log('✅ No orphaned frames found.');
        return;
    }

    console.log(`Found ${orphanedFrames.length} orphaned frames, fixing...`);

    // Group orphaned frames by project
    const framesByProject = new Map<string, { frameId: string; canvasId: string; projectId: string }[]>();

    for (const orphan of orphanedFrames) {
        if (!framesByProject.has(orphan.projectId)) {
            framesByProject.set(orphan.projectId, []);
        }
        framesByProject.get(orphan.projectId)!.push(orphan);
    }

    // Process projects in parallel batches for optimal performance
    const projectIds = Array.from(framesByProject.keys());
    const concurrencyLimit = 100; // Process up to 100 projects simultaneously
    const batches = chunkArray(projectIds, concurrencyLimit);

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (!batch || batch.length === 0) continue;

        console.log(`  Processing batch ${i + 1}/${batches.length} (${batch.length} projects)`);

        // Process all projects in the batch in parallel
        await Promise.all(batch.map(projectId =>
            fixOrphanedFramesForProject(projectId, framesByProject.get(projectId)!.length)
        ));
    }
}

// Fix orphaned frames for a specific project using bulk operations
async function fixOrphanedFramesForProject(
    projectId: string,
    orphanCount: number
): Promise<void> {
    const defaultBranch = await db
        .select({ id: branchesTable.id })
        .from(branchesTable)
        .where(eq(branchesTable.projectId, projectId))
        .limit(1);

    let branchId: string;

    if (defaultBranch.length > 0 && !!defaultBranch[0]?.id) {
        branchId = defaultBranch[0].id;
    } else {
        branchId = await createEmergencyBranch(projectId);
    }

    // Direct bulk update without fetching frame IDs first - more efficient
    const result = await db.transaction(async (tx) => {
        return await tx
            .update(frames)
            .set({ branchId })
            .where(
                and(
                    inArray(
                        frames.canvasId,
                        tx.select({ id: canvases.id })
                            .from(canvases)
                            .where(eq(canvases.projectId, projectId))
                    ),
                    isNull(frames.branchId)
                )
            );
    });

    console.log(`  └─ Fixed ${orphanCount} orphaned frames for project ${projectId}`);
}

// Create emergency branch with proper error handling
async function createEmergencyBranch(projectId: string): Promise<string> {
    console.log(`  └─ Creating emergency branch for orphaned frames in project ${projectId}`);

    // Double-check in case a branch was created concurrently
    const recheckBranch = await db
        .select({ id: branchesTable.id })
        .from(branchesTable)
        .where(eq(branchesTable.projectId, projectId))
        .limit(1);

    if (recheckBranch.length > 0 && !!recheckBranch[0]?.id) {
        console.log(`    └─ Branch was created concurrently, using existing one`);
        return recheckBranch[0].id;
    }

    const emergencyBranch = createDefaultBranch({
        projectId: projectId,
        sandboxId: uuidv4(),
    });

    try {
        await db.transaction(async (tx) => {
            await tx.insert(branchesTable).values(emergencyBranch);
        });
        return emergencyBranch.id;
    } catch (error: any) {
        if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
            console.log(`    └─ Emergency branch already exists, finding it...`);
            const existingBranch = await db
                .select({ id: branchesTable.id })
                .from(branchesTable)
                .where(eq(branchesTable.projectId, projectId))
                .limit(1);

            if (existingBranch.length > 0 && !!existingBranch[0]?.id) {
                return existingBranch[0].id;
            } else {
                throw new Error(`Failed to create or find branch for project ${projectId}`);
            }
        } else {
            throw error;
        }
    }
}

// Verify migration completeness
async function verifyMigrationCompleteness(newBranchesCount: number): Promise<void> {
    console.log('✅ Verifying migration completeness...');

    const finalFramesWithoutBranches = await db
        .select({ count: frames.id })
        .from(frames)
        .where(isNull(frames.branchId));

    const finalTotalBranches = await db
        .select({ count: branchesTable.id })
        .from(branchesTable);

    const finalTotalProjects = await db
        .select({ count: projects.id })
        .from(projects);

    console.log(`\n📊 Final Migration Summary:`);
    console.log(`  • Total projects: ${finalTotalProjects.length}`);
    console.log(`  • Total branches: ${finalTotalBranches.length}`);
    console.log(`  • Frames without branch reference: ${finalFramesWithoutBranches.length}`);
    console.log(`  • New branches created this run: ${newBranchesCount}`);

    if (finalFramesWithoutBranches.length > 0) {
        throw new Error(`Migration incomplete: ${finalFramesWithoutBranches.length} frames still lack branch references`);
    }
}

export async function migrateToBranching() {
    console.log('🔄 Starting migration to branching structure...');

    try {
        // Step 1: Check migration status
        const status = await checkMigrationStatus();

        console.log('📊 Current migration state:');
        console.log(`  • Total projects: ${status.totalProjects}`);
        console.log(`  • Total branches: ${status.totalBranches}`);
        console.log(`  • Frames without branch reference: ${status.framesWithoutBranches}`);

        if (status.isCompleted) {
            console.log('✅ Migration already completed - nothing to do!');
            return;
        }

        if (status.isPartial) {
            console.log('🔄 Detected partial migration - resuming from where we left off...');
        } else {
            console.log('🚀 Starting fresh migration...');
        }

        // Step 2: Get projects to migrate
        console.log('📋 Fetching projects without default branches...');
        const projectsToMigrate = await getProjectsToMigrate();

        if (projectsToMigrate.length === 0) {
            console.log('✅ All projects already have branches!');
        } else {
            console.log(`Found ${projectsToMigrate.length} projects to migrate`);
        }

        // Step 3: Create and insert branches
        const newBranches = createBranchesForProjects(projectsToMigrate);
        await insertBranchesInBatches(newBranches);

        // Step 4: Update frames
        await updateFramesForBranches(newBranches);

        // Step 5: Fix orphaned frames
        await fixOrphanedFrames();

        // Step 6: Verify completeness
        await verifyMigrationCompleteness(newBranches.length);

        console.log('\n✅ Migration to branching structure completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// CLI runner
if (require.main === module) {
    (async () => {
        try {
            if (!process.env.SUPABASE_DATABASE_URL) {
                throw new Error('SUPABASE_DATABASE_URL environment variable is required');
            }

            console.log('🚀 Starting branching migration...');
            await migrateToBranching();
            console.log('🎉 Migration completed successfully');
            process.exit(0);
        } catch (error) {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        }
    })();
}