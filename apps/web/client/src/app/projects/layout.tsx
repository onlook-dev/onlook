import { env } from '@/env';
import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/server';
import { getReturnUrlQueryParam } from '@/utils/url';
import { db } from '@onlook/db/src/client';
import { legacySubscriptions, subscriptions } from '@onlook/db';
import { SubscriptionStatus } from '@onlook/stripe';
import { and, eq, isNull } from 'drizzle-orm';
import { type Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Onlook',
    description: 'Onlook – Projects',
};

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
        const headersList = await headers();
        const pathname = headersList.get('x-pathname') || Routes.PROJECTS;
        redirect(`${Routes.LOGIN}?${getReturnUrlQueryParam(pathname)}`);
    }

    // Force demo-only mode for testing (feature flag)
    if (env.NEXT_PUBLIC_FORCE_DEMO_ONLY) {
        redirect(Routes.DEMO_ONLY);
    }

    // Check if user has an active subscription
    const userId = session.user.id;
    const userEmail = session.user.email;

    // Check for active subscription
    const subscription = await db.query.subscriptions.findFirst({
        where: and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.status, SubscriptionStatus.ACTIVE),
        ),
    });

    // Check for legacy subscription
    const legacySubscription = userEmail ? await db.query.legacySubscriptions.findFirst({
        where: and(
            eq(legacySubscriptions.email, userEmail),
            isNull(legacySubscriptions.redeemAt),
        ),
    }) : null;

    // If no subscription, redirect to demo page
    if (!subscription && !legacySubscription) {
        redirect(Routes.DEMO_ONLY);
    }

    return <>{children}</>;
}
