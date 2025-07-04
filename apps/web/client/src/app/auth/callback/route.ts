import { client } from '@/utils/analytics/server';
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
            const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development';
            const user = await api.user.upsert({
                id: data.user.id,
                firstName: data.user.user_metadata?.first_name,
                lastName: data.user.user_metadata?.last_name,
                displayName: data.user.user_metadata?.display_name,
                email: data.user.email,
                avatarUrl: data.user.user_metadata?.avatar_url,
            });

            trackUserSignedIn(user.id, {
                name: data.user.user_metadata.name,
                email: data.user.email,
                avatar_url: data.user.user_metadata.avatar_url,
            });

            // Redirect to the redirect page which will handle the return URL
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}/auth/redirect`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}/auth/redirect`);
            } else {
                return NextResponse.redirect(`${origin}/auth/redirect`);
            }
        }
        console.error(`Error exchanging code for session: ${error}`);
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

function trackUserSignedIn(userId: string, properties: Record<string, any>) {
    try {
        if (!client) {
            console.warn('PostHog client not found, skipping user signed in tracking');
            return;
        }
        client.identify({
            distinctId: userId,
            properties: {
                ...properties,
                $set_once: {
                    signup_date: new Date().toISOString(),
                }
            }
        });
        client.capture({ event: 'user_signed_in', distinctId: userId });
    } catch (error) {
        console.error('Error tracking user signed in:', error);
    }
}
