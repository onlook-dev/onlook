import { createClient } from '@/utils/supabase/server';
import { db } from '@onlook/db/src/client';
import { users } from '@onlook/db/src/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const installationId = url.searchParams.get('installation_id');
        const setupAction = url.searchParams.get('setup_action');
        const state = url.searchParams.get('state');

        console.log('GitHub setup callback:', { installationId, setupAction, state });

        if (!installationId) {
            return NextResponse.json(
                { error: 'Missing installation_id parameter' },
                { status: 400 }
            );
        }

        // Get the current user from session
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('Authentication error:', authError);
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Validate state parameter matches current user ID for CSRF protection
        if (state && state !== user.id) {
            console.error('State mismatch:', { expected: user.id, received: state });
            return NextResponse.json(
                { error: 'Invalid state parameter' },
                { status: 400 }
            );
        }

        // Update user's GitHub installation ID
        try {
            await db
                .update(users)
                .set({ githubInstallationId: installationId })
                .where(eq(users.id, user.id));

            console.log(`Updated installation ID for user: ${user.id}`);

            return NextResponse.json({
                status: 'success',
                message: 'GitHub App installation completed successfully',
                installationId
            });

        } catch (dbError) {
            console.error('Database error:', dbError);
            return NextResponse.json(
                { error: 'Failed to update installation' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('GitHub setup callback error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}