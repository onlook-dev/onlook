'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/server';

export async function connectGitHubOAuth() {
    const supabase = await createClient();
    const origin = (await headers()).get('origin');

    if (!origin) {
        throw new Error('Origin header not found');
    }

    const redirectTo = `${origin}${Routes.AUTH_CALLBACK}`;

    // Link GitHub provider to existing account (not create new account)
    const { data, error } = await supabase.auth.linkIdentity({
        provider: 'github',
        options: {
            redirectTo,
            scopes: 'repo read:user user:email',
            skipBrowserRedirect: false,
        },
    });

    if (error) {
        console.error('Error linking GitHub identity:', error);
        redirect(`${Routes.IMPORT_GITHUB}?error=oauth_failed`);
    }

    if (data?.url) {
        redirect(data.url);
    }
}
