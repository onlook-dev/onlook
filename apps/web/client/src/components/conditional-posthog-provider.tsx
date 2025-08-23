"use client"

import { env } from "@/env"
import { PostHogProvider } from "./posthog-provider"

export const ConditionalPostHogProvider = ({ children }: { children: React.ReactNode }) => {
    const hasValidKey = env.NEXT_PUBLIC_POSTHOG_KEY && 
                       env.NEXT_PUBLIC_POSTHOG_KEY.trim() !== '' &&
                       !env.NEXT_PUBLIC_POSTHOG_KEY.includes('<Your PostHog API key') &&
                       !env.NEXT_PUBLIC_POSTHOG_KEY.startsWith('<')

    if (hasValidKey) {
        return <PostHogProvider>{children}</PostHogProvider>
    }

    return <>{children}</>
}