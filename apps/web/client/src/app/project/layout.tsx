import { env } from "@/env";
import { Routes } from "@/utils/constants";
import { createClient } from "@/utils/supabase/server";
import { checkUserSubscriptionAccess } from "@/utils/subscription";
import { redirect } from "next/navigation";

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
        redirect(Routes.LOGIN);
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