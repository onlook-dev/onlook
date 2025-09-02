import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, isNull } from 'drizzle-orm';
import postgres from 'postgres';
import { v4 as uuidv4 } from 'uuid';
import type { Project, Frame } from '../schema';

/**
 * Migration script to transition existing projects to the new branching structure
 * 
 * This script:
 * 1. Creates a default branch for each existing project
 * 2. Migrates sandboxId and sandboxUrl from projects to the default branch
 * 3. Updates all existing frames to reference the default branch
 * 4. Handles nullable removed fields gracefully
 */

interface LegacyProject {
    id: string;
    name: string;
    description: string | null;
    sandboxId: string | null;
    sandboxUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface LegacyFrame {
    id: string;
    canvasId: string;
    url: string;
    x: string;
    y: string;
    width: string;
    height: string;
}

export async function migrateToBranching(databaseUrl: string) {
    console.log('🔄 Starting migration to branching structure...');
    
    const conn = postgres(databaseUrl, { prepare: false });
    const db = drizzle(conn);

    try {
        // Step 1: Get all existing projects that don't have branches yet
        console.log('📋 Fetching existing projects...');
        const existingProjects = await db.execute<LegacyProject>(
            `SELECT id, name, description, sandbox_id, sandbox_url, created_at, updated_at 
             FROM projects 
             WHERE NOT EXISTS (SELECT 1 FROM branches WHERE branches.project_id = projects.id)`
        );

        console.log(`Found ${existingProjects.length} projects to migrate`);

        for (const project of existingProjects) {
            console.log(`🔀 Migrating project: ${project.name} (${project.id})`);
            
            // Step 2: Create default branch for each project
            const branchId = uuidv4();
            const sandboxId = project.sandboxId || uuidv4(); // Generate new sandbox ID if null
            
            await db.execute(`
                INSERT INTO branches (
                    id, 
                    project_id, 
                    name, 
                    description, 
                    is_default, 
                    sandbox_id,
                    created_at, 
                    updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8
                )
            `, [
                branchId,
                project.id,
                'main',
                'Main branch',
                true,
                sandboxId,
                project.createdAt,
                project.updatedAt
            ]);

            // Step 3: Get all frames for this project and update them to reference the default branch
            const projectFrames = await db.execute<LegacyFrame>(
                `SELECT f.id, f.canvas_id, f.url, f.x, f.y, f.width, f.height
                 FROM frames f
                 JOIN canvases c ON f.canvas_id = c.id
                 WHERE c.project_id = $1 AND f.branch_id IS NULL`,
                [project.id]
            );

            console.log(`  └─ Updating ${projectFrames.length} frames to reference default branch`);

            if (projectFrames.length > 0) {
                // Update frames to reference the default branch
                await db.execute(
                    `UPDATE frames 
                     SET branch_id = $1 
                     WHERE id = ANY($2)`,
                    [branchId, projectFrames.map(f => f.id)]
                );
            }

            console.log(`  ✅ Successfully migrated project ${project.name}`);
        }

        // Step 4: Handle any orphaned frames (frames without a valid branch reference)
        console.log('🧹 Cleaning up any orphaned frames...');
        const orphanedFrames = await db.execute(
            `SELECT f.id, c.project_id 
             FROM frames f 
             JOIN canvases c ON f.canvas_id = c.id 
             WHERE f.branch_id IS NULL`
        );

        for (const orphanFrame of orphanedFrames) {
            // Find or create a default branch for this frame's project
            let defaultBranch = await db.execute(
                `SELECT id FROM branches WHERE project_id = $1 AND is_default = true LIMIT 1`,
                [orphanFrame.project_id]
            );

            if (defaultBranch.length === 0) {
                // Create a default branch if none exists
                const branchId = uuidv4();
                const sandboxId = uuidv4();
                
                await db.execute(`
                    INSERT INTO branches (
                        id, project_id, name, description, is_default, sandbox_id, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, NOW(), NOW()
                    )
                `, [branchId, orphanFrame.project_id, 'main', 'Main branch', true, sandboxId]);
                
                defaultBranch = [{ id: branchId }];
            }

            await db.execute(
                `UPDATE frames SET branch_id = $1 WHERE id = $2`,
                [defaultBranch[0].id, orphanFrame.id]
            );
        }

        console.log(`  ✅ Cleaned up ${orphanedFrames.length} orphaned frames`);

        // Step 5: Verification - ensure all frames now have branch references
        const framesWithoutBranches = await db.execute(
            `SELECT COUNT(*) as count FROM frames WHERE branch_id IS NULL`
        );
        
        const branchCount = await db.execute(`SELECT COUNT(*) as count FROM branches`);
        
        console.log(`\n📊 Migration Summary:`);
        console.log(`  • Projects migrated: ${existingProjects.length}`);
        console.log(`  • Branches created: ${branchCount[0].count}`);
        console.log(`  • Frames without branch reference: ${framesWithoutBranches[0].count}`);
        
        if (framesWithoutBranches[0].count > 0) {
            throw new Error(`Migration incomplete: ${framesWithoutBranches[0].count} frames still lack branch references`);
        }

        console.log('✅ Migration to branching structure completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await conn.end();
    }
}

// CLI runner
if (require.main === module) {
    const databaseUrl = process.env.SUPABASE_DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ SUPABASE_DATABASE_URL environment variable is required');
        process.exit(1);
    }
    
    migrateToBranching(databaseUrl)
        .then(() => {
            console.log('🎉 Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}