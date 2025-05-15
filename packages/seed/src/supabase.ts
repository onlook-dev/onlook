import { createClient } from "@supabase/supabase-js";
import { USER_EMAIL, USER_ID, USER_PASSWORD } from "./constants";

export const seedUser = async () => {
    console.log('Seeding Supabase user...');

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user: existingUser } } = await supabase.auth.admin.getUserById(USER_ID);

    if (existingUser) {
        console.log('User already exists, skipping user creation');
        return;
    }

    try {
        const { data, error } = await supabase.auth.admin.createUser({
            id: USER_ID,
            email: USER_EMAIL,
            password: USER_PASSWORD,
            email_confirm: true,
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
