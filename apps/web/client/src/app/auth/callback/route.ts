import { trackEvent } from '@/utils/analytics/server';
import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { api } from '~/trpc/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');

    if (code) {
        const supabase = await createClient();
        const { error, data } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            const user = await api.user.upsert({
                id: data.user.id,
            });

            if (!user) {
                console.error(`Failed to create user for id: ${data.user.id}`, { user });
                return NextResponse.redirect(`${origin}/auth/auth-code-error`);
            }

            trackEvent({
                distinctId: data.user.id,
                event: 'user_signed_in',
                properties: {
                    name: data.user.user_metadata.name,
                    email: data.user.email,
                    avatar_url: data.user.user_metadata.avatar_url,
                    $set_once: {
                        signup_date: new Date().toISOString(),
                    }
                }
            });

            // 构建重定向 URL，携带 accessToken（用于 IDE 浏览器场景）
            const redirectUrl = new URL(`${origin}${Routes.AUTH_REDIRECT}`);
            if (data.session?.access_token) {
                redirectUrl.searchParams.set('accessToken', data.session.access_token);
            }

            // Always use the request origin to prevent open redirect via X-Forwarded-Host header manipulation
            return NextResponse.redirect(redirectUrl.toString());
        }
        console.error(`Error exchanging code for session: ${error}`);
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
