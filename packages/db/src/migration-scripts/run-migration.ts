#!/usr/bin/env bun

/**
 * Migration Runner
 * 
 * Simple script to run database migrations with proper error handling and environment validation.
 * 
 * Usage:
 *   SUPABASE_DATABASE_URL="your_url" bun run-migration.ts [migration-name]
 *   
 * Available migrations:
 *   - branching: Migrate to branching structure
 */

import { migrateToBranching } from './migrate-to-branching';

const MIGRATIONS = {
    'branching': migrateToBranching,
} as const;

type MigrationName = keyof typeof MIGRATIONS;

async function main() {
    const migrationName = (process.argv[2] || 'branching') as MigrationName;
    
    // Validate migration name
    if (!MIGRATIONS[migrationName]) {
        console.error(`❌ Unknown migration: ${migrationName}`);
        console.log(`Available migrations: ${Object.keys(MIGRATIONS).join(', ')}`);
        process.exit(1);
    }
    
    // Validate environment
    const databaseUrl = process.env.SUPABASE_DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ SUPABASE_DATABASE_URL environment variable is required');
        console.log('\nExample:');
        console.log('SUPABASE_DATABASE_URL="postgresql://user:pass@host:port/db" bun run-migration.ts');
        process.exit(1);
    }
    
    // Confirm before running
    console.log(`🔄 About to run migration: ${migrationName}`);
    console.log(`📍 Database URL: ${databaseUrl.replace(/\/\/.*@/, '//***@')}`); // Hide credentials
    console.log('\n⚠️  Make sure you have backed up your database before proceeding!');
    
    if (process.env.NODE_ENV === 'production') {
        console.log('\n🚨 Production environment detected! Please confirm by setting CONFIRM_MIGRATION=true');
        if (process.env.CONFIRM_MIGRATION !== 'true') {
            process.exit(1);
        }
    }
    
    try {
        console.log(`\n🚀 Starting migration: ${migrationName}...`);
        const startTime = Date.now();
        
        await MIGRATIONS[migrationName](databaseUrl);
        
        const duration = Date.now() - startTime;
        console.log(`\n🎉 Migration completed successfully in ${duration}ms`);
        
    } catch (error) {
        console.error(`\n💥 Migration failed:`, error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});