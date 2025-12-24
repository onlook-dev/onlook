import { config } from 'dotenv';
import { resetDb } from './db';

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

        await resetDb();
        process.exit(0);
    } catch (error) {
        console.error('Error clearing database:', error);
        process.exit(1);
    }
})();