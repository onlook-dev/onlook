import { config } from 'dotenv';
import { eq, isNull, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../client';
import { createDefaultBranch } from '../defaults/branch';
import type { Branch, Project } from '../schema';
import { branches, canvases, frames, projects } from '../schema';

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

export async function migrateToBranching() {
    console.log('🔄 Starting migration to branching structure...');

    try {
        // Check if this is a resumed migration
        const totalProjects = await db.select({ count: projects.id }).from(projects);
        const totalBranches = await db.select({ count: branches.id }).from(branches);
        const framesWithoutBranches = await db
            .select({ count: frames.id })
            .from(frames)
            .where(isNull(frames.branchId));

        console.log('📊 Current migration state:');
        console.log(`  • Total projects: ${totalProjects.length}`);
        console.log(`  • Total branches: ${totalBranches.length}`);
        console.log(`  • Frames without branch reference: ${framesWithoutBranches.length}`);

        if (totalBranches.length > 0 && totalBranches.length === totalProjects.length && framesWithoutBranches.length === 0) {
            console.log('✅ Migration already completed - nothing to do!');
            return;
        }

        if (totalBranches.length > 0) {
            console.log('🔄 Detected partial migration - resuming from where we left off...');
        } else {
            console.log('🚀 Starting fresh migration...');
        }

        // Step 1: Get all existing projects that don't have default branches yet
        console.log('📋 Fetching projects without default branches...');

        const projectsToMigrate = await db
            .select()
            .from(projects)
            .leftJoin(branches, eq(projects.id, branches.projectId))
            .where(isNull(branches.id));

        if (projectsToMigrate.length === 0) {
            console.log('✅ All projects already have branches!');
        } else {
            console.log(`Found ${projectsToMigrate.length} projects to migrate`);
        }

        // Step 2: Create default branches for projects that need them
        const newBranches: Branch[] = [];

        for (const { projects: project } of projectsToMigrate) {
            console.log(`🔀 Creating default branch for project: ${project.name} (${project.id})`);

            // Cast to legacy project to access potentially removed fields
            const legacyProject = project as LegacyProject;
            const sandboxId = legacyProject.sandboxId || uuidv4();

            const defaultBranch = createDefaultBranch({
                projectId: project.id,
                sandboxId,
            });

            newBranches.push(defaultBranch);
        }

        // Step 3: Insert all new branches in batched transactions
        if (newBranches.length > 0) {
            console.log(`📥 Inserting ${newBranches.length} default branches...`);
            
            // Insert branches in batches to avoid parameter limits
            const branchBatchSize = 500; // Conservative batch size for branch inserts
            const branchChunks = chunkArray(newBranches, branchBatchSize);
            
            for (let i = 0; i < branchChunks.length; i++) {
                const chunk = branchChunks[i];
                console.log(`  └─ Inserting batch ${i + 1}/${branchChunks.length} (${chunk.length} branches)`);
                
                try {
                    await db.transaction(async (tx) => {
                        await tx.insert(branches).values(chunk);
                    });
                } catch (error: any) {
                    // Check if this is a constraint violation (branches already exist)
                    if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
                        console.log(`    └─ Batch ${i + 1} branches already exist (safe to continue)`);
                    } else {
                        // Re-throw if it's not a duplicate key error
                        throw error;
                    }
                }
            }

            // Step 4: Update frames to reference default branches (in separate transactions)
            console.log('🔗 Updating frames to reference default branches...');

            for (const branch of newBranches) {
                // Get all frames for this project's canvas that don't have a branch reference
                const projectFrames = await db
                    .select({
                        id: frames.id,
                        canvasId: frames.canvasId
                    })
                    .from(frames)
                    .innerJoin(canvases, eq(frames.canvasId, canvases.id))
                    .where(
                        eq(canvases.projectId, branch.projectId).and(
                            isNull(frames.branchId)
                        )
                    );

                if (projectFrames.length > 0) {
                    const frameIds = projectFrames.map(f => f.id);
                    console.log(`  └─ Updating ${frameIds.length} frames for project ${branch.projectId}`);

                    // Process frames in batches to avoid parameter limits
                    const batchSize = 1000;
                    const frameIdChunks = chunkArray(frameIds, batchSize);

                    for (let i = 0; i < frameIdChunks.length; i++) {
                        const chunk = frameIdChunks[i];
                        console.log(`    └─ Processing batch ${i + 1}/${frameIdChunks.length} (${chunk.length} frames)`);

                        await db.transaction(async (tx) => {
                            await tx
                                .update(frames)
                                .set({ branchId: branch.id })
                                .where(inArray(frames.id, chunk));
                        });
                    }
                } else {
                    console.log(`  └─ No frames need updating for project ${branch.projectId} (already have branchId)`);
                }
            }
        }

        // Step 5: Handle any remaining orphaned frames
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

        if (orphanedFrames.length > 0) {
            console.log(`Found ${orphanedFrames.length} orphaned frames, fixing...`);

            // Group orphaned frames by project to batch process them
            const framesByProject = new Map<string, { frameId: string; canvasId: string; projectId: string }[]>();
            
            for (const orphan of orphanedFrames) {
                if (!framesByProject.has(orphan.projectId)) {
                    framesByProject.set(orphan.projectId, []);
                }
                framesByProject.get(orphan.projectId)!.push(orphan);
            }

            for (const [projectId, projectOrphans] of framesByProject) {
                // Find the default branch for this project
                const defaultBranch = await db
                    .select({ id: branches.id })
                    .from(branches)
                    .where(eq(branches.projectId, projectId))
                    .limit(1);

                let branchId: string;

                if (defaultBranch.length > 0 && !!defaultBranch[0]?.id) {
                    branchId = defaultBranch[0].id;
                } else {
                    // Create a default branch if none exists - but double-check first
                    console.log(`  └─ Creating emergency branch for orphaned frames in project ${projectId}`);
                    
                    // Double-check in case a branch was created concurrently
                    const recheckBranch = await db
                        .select({ id: branches.id })
                        .from(branches)
                        .where(eq(branches.projectId, projectId))
                        .limit(1);
                        
                    if (recheckBranch.length > 0 && !!recheckBranch[0]?.id) {
                        console.log(`    └─ Branch was created concurrently, using existing one`);
                        branchId = recheckBranch[0].id;
                    } else {
                        const emergencyBranch = createDefaultBranch({
                            projectId: projectId,
                            sandboxId: uuidv4(),
                        });

                        try {
                            await db.transaction(async (tx) => {
                                await tx.insert(branches).values(emergencyBranch);
                            });
                            branchId = emergencyBranch.id;
                        } catch (error: any) {
                            // If branch creation fails due to constraint, find the existing one
                            if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
                                console.log(`    └─ Emergency branch already exists, finding it...`);
                                const existingBranch = await db
                                    .select({ id: branches.id })
                                    .from(branches)
                                    .where(eq(branches.projectId, projectId))
                                    .limit(1);
                                
                                if (existingBranch.length > 0 && !!existingBranch[0]?.id) {
                                    branchId = existingBranch[0].id;
                                } else {
                                    throw new Error(`Failed to create or find branch for project ${projectId}`);
                                }
                            } else {
                                throw error;
                            }
                        }
                    }
                }

                // Update orphaned frames for this project in batches
                const frameIds = projectOrphans.map(o => o.frameId);
                const batchSize = 1000;
                const frameIdChunks = chunkArray(frameIds, batchSize);

                for (let i = 0; i < frameIdChunks.length; i++) {
                    const chunk = frameIdChunks[i];
                    console.log(`  └─ Fixing batch ${i + 1}/${frameIdChunks.length} (${chunk.length} orphaned frames) for project ${projectId}`);

                    await db.transaction(async (tx) => {
                        await tx
                            .update(frames)
                            .set({ branchId })
                            .where(inArray(frames.id, chunk));
                    });
                }
            }
        }

        // Step 6: Verification
        console.log('✅ Verifying migration completeness...');

        const framesWithoutBranches = await db
            .select({ count: frames.id })
            .from(frames)
            .where(isNull(frames.branchId));

        const totalBranches = await db
            .select({ count: branches.id })
            .from(branches);

        const totalProjects = await db
            .select({ count: projects.id })
            .from(projects);

        console.log(`\n📊 Final Migration Summary:`);
        console.log(`  • Total projects: ${totalProjects.length}`);
        console.log(`  • Total branches: ${totalBranches.length}`);
        console.log(`  • Frames without branch reference: ${framesWithoutBranches.length}`);
        console.log(`  • New branches created this run: ${newBranches.length}`);

        if (framesWithoutBranches.length > 0) {
            throw new Error(`Migration incomplete: ${framesWithoutBranches.length} frames still lack branch references`);
        }

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