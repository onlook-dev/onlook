'use server';

import { env } from '@/env';
import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/server';
import { SEED_USER } from '@onlook/db';
import { SignInMethod } from '@onlook/models';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(provider: SignInMethod.GITHUB | SignInMethod.GOOGLE) {
    const supabase = await createClient();
    const origin = (await headers()).get('origin') ?? env.NEXT_PUBLIC_SITE_URL;
    const redirectTo = `${origin}${Routes.AUTH_CALLBACK}`;

    // If already session, redirect
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (session) {
        redirect(Routes.AUTH_REDIRECT);
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
        redirect(Routes.AUTH_REDIRECT);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: SEED_USER.EMAIL,
        password: SEED_USER.PASSWORD,
    });

    if (error) {
        console.error('Error signing in with password:', error);
        throw new Error('Error signing in with password');
    }
    redirect(Routes.AUTH_REDIRECT);
}