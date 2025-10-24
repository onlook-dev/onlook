'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { env } from '@/env';
import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/server';

export async function connectGitHubRepos() {
    const supabase = await createClient();
    const origin = (await headers()).get('origin') ?? env.NEXT_PUBLIC_SITE_URL;
    const redirectTo = `${origin}${Routes.IMPORT_GITHUB}`;

    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
        redirect('/login');
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo,
            scopes: 'repo', // Request repository access
            skipBrowserRedirect: false,
        },
    });

    if (error) {
        console.error('Error requesting GitHub repo access:', error);
        redirect(`${Routes.IMPORT_GITHUB}?error=oauth_failed`);
    }

    if (data?.url) {
        redirect(data.url);
    }
}
