import { config } from 'dotenv';
import { eq, isNull } from 'drizzle-orm';
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

export async function migrateToBranching() {
    console.log('🔄 Starting migration to branching structure...');

    try {
        // Step 1: Get all existing projects that don't have default branches yet
        console.log('📋 Fetching projects without default branches...');

        const projectsToMigrate = await db
            .select()
            .from(projects)
            .leftJoin(branches, eq(projects.id, branches.projectId))
            .where(isNull(branches.id));

        console.log(`Found ${projectsToMigrate.length} projects to migrate`);

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

        // Step 3: Insert all new branches in a transaction
        if (newBranches.length > 0) {
            await db.transaction(async (tx) => {
                console.log(`📥 Inserting ${newBranches.length} default branches...`);
                await tx.insert(branches).values(newBranches);

                // Step 4: Update frames to reference default branches
                console.log('🔗 Updating frames to reference default branches...');

                for (const branch of newBranches) {
                    // Get all frames for this project's canvas that don't have a branch reference
                    const projectFrames = await tx
                        .select({
                            id: frames.id,
                            canvasId: frames.canvasId
                        })
                        .from(frames)
                        .innerJoin(canvases, eq(frames.canvasId, canvases.id))
                        .where(
                            eq(canvases.projectId, branch.projectId)
                        );

                    if (projectFrames.length > 0) {
                        const frameIds = projectFrames.map(f => f.id);
                        console.log(`  └─ Updating ${frameIds.length} frames for project ${branch.projectId}`);

                        // Update frames to reference the default branch
                        for (const frameId of frameIds) {
                            await tx
                                .update(frames)
                                .set({ branchId: branch.id })
                                .where(eq(frames.id, frameId));
                        }
                    }
                }
            });
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

            await db.transaction(async (tx) => {
                for (const orphan of orphanedFrames) {
                    // Find the default branch for this frame's project
                    const defaultBranch = await tx
                        .select({ id: branches.id })
                        .from(branches)
                        .where(
                            eq(branches.projectId, orphan.projectId)
                        )
                        .limit(1);

                    if (defaultBranch.length > 0 && !!defaultBranch[0]?.id) {
                        await tx
                            .update(frames)
                            .set({ branchId: defaultBranch[0].id })
                            .where(eq(frames.id, orphan.frameId));
                    } else {
                        // Create a default branch if none exists
                        console.log(`  └─ Creating emergency branch for orphaned frame in project ${orphan.projectId}`);
                        const emergencyBranch = createDefaultBranch({
                            projectId: orphan.projectId,
                            sandboxId: uuidv4(),
                        });

                        await tx.insert(branches).values(emergencyBranch);
                        await tx
                            .update(frames)
                            .set({ branchId: emergencyBranch.id })
                            .where(eq(frames.id, orphan.frameId));
                    }
                }
            });
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

        console.log(`\n📊 Migration Summary:`);
        console.log(`  • Total projects: ${totalProjects.length}`);
        console.log(`  • Total branches: ${totalBranches.length}`);
        console.log(`  • Frames without branch reference: ${framesWithoutBranches.length}`);
        console.log(`  • New branches created: ${newBranches.length}`);

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