import { createClient } from '@/utils/supabase/server';
import type { User } from '@onlook/db';
import { NextResponse } from 'next/server';
import { api } from '~/trpc/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/';

    if (code) {
        const supabase = await createClient();
        const { error, data } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development';
            const user = await getOrCreateUser(data.user.id);
            if (isLocalEnv) {
                // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(`${origin}${next}`);
            }
        }
        console.error(`Error exchanging code for session: ${error}`);
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

async function getOrCreateUser(userId: string): Promise<User> {
    const user = await api.user.getById(userId);
    if (!user) {
        console.log(`User ${userId} not found, creating...`);
        const newUser = await api.user.create({ id: userId });
        return newUser;
    }
    console.log(`User ${userId} found, returning...`);
    return user;
}
