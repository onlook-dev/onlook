'use server';

import { createClient } from '@/utils/supabase/server';
import { SignInMethod } from '@onlook/models';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(provider: SignInMethod) {
    const supabase = await createClient();
    const origin = (await headers()).get('origin');

    // If already session, redirect
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (session) {
        redirect('/');
    }

    // Start OAuth flow
    // Note: User object will be created in the auth callback route if it doesn't exist
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${origin}/auth/callback`,
        },
    });

    if (error) {
        redirect('/error');
    }

    redirect(data.url);
}
