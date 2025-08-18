'use server';

import { createClient } from '@/utils/supabase/server';
import { SEED_USER } from '@onlook/db';
import { SignInMethod } from '@onlook/models';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(provider: SignInMethod.GITHUB | SignInMethod.GOOGLE, returnUrl?: string) {

    const supabase = await createClient();
    const headersList = await headers();
    let origin = headersList.get('origin');
    
    const redirectTo = returnUrl
        ? `${origin}/auth/callback?returnUrl=${encodeURIComponent(returnUrl)}`
        : `${origin}/auth/callback`;

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
            redirectTo,
        },
    });

    if (error) {
        redirect('/error');
    }

    redirect(data.url);
}

export async function devLogin() {
    if (process.env.NODE_ENV !== 'development') {
        throw new Error('Dev login is only available in development mode');
    }

    const supabase = await createClient();

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        redirect('/');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: SEED_USER.EMAIL,
        password: SEED_USER.PASSWORD,
    });

    if (error) {
        console.error('Error signing in with password:', error);
        throw new Error('Error signing in with password');
    }
    redirect('/');
}