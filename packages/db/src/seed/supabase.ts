import { createClient } from "@supabase/supabase-js";
import { SEED_USER } from "./constants";

export const seedSupabaseUser = async () => {
    console.log('Seeding Supabase user...');

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user: existingUser } } = await supabase.auth.admin.getUserById(SEED_USER.ID);

    if (existingUser) {
        console.log('User already exists, skipping user creation');
        return;
    }

    try {
        const { data, error } = await supabase.auth.admin.createUser({
            id: SEED_USER.ID,
            email: SEED_USER.EMAIL,
            password: SEED_USER.PASSWORD,
            email_confirm: true,
            user_metadata: {
                first_name: SEED_USER.FIRST_NAME,
                last_name: SEED_USER.LAST_NAME,
                display_name: SEED_USER.DISPLAY_NAME,
                avatar_url: SEED_USER.AVATAR_URL,
            },
        });

        if (error) {
            console.error('Error seeding Supabase user:', error);
            throw error;
        }
        console.log('User seeded!');
    } catch (error: any) {
        // Handle specific errors
        if (error.message?.includes('duplicate key value')) {
            console.log('User already exists with this email, skipping user creation');
            return;
        }
        console.error('Error seeding Supabase user:', error);
        throw error;
    }
};
