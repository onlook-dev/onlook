import { env } from '@/env';
import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/server';
import { checkUserSubscriptionAccess } from '@/utils/subscription';
import { getReturnUrlQueryParam } from '@/utils/url';
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

    // Check if user has an active subscription
    const { hasActiveSubscription, hasLegacySubscription } = await checkUserSubscriptionAccess(
        session.user.id,
        session.user.email,
    );

    // If no subscription, redirect to demo page
    if (!hasActiveSubscription && !hasLegacySubscription) {
        redirect(Routes.DEMO_ONLY);
    }

    return <>{children}</>;
}
