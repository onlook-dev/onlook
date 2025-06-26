import { config } from 'dotenv';
import { resetDb, seedDb } from './db';
import { seedSupabaseUser } from './supabase';

// Load .env file
config({ path: '../../.env' });

(async () => {
    try {
        if (!process.env.SUPABASE_DATABASE_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const missingVars = [];
            if (!process.env.SUPABASE_DATABASE_URL) missingVars.push('SUPABASE_DATABASE_URL');
            if (!process.env.SUPABASE_URL) missingVars.push('SUPABASE_URL');
            if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
            throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
        }

        await seedSupabaseUser();
        await resetDb();
        await seedDb();
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
})();