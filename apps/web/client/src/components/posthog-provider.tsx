"use client"

import { env } from "@/env"
import { api } from "@/trpc/react"
import { observer } from "mobx-react-lite"
import posthog from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"
import { useEffect } from "react"

export const PostHogProvider = observer(({ children }: { children: React.ReactNode }) => {
    const { data: user } = api.user.get.useQuery();

    useEffect(() => {
        if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
            console.warn('PostHog key is not set, skipping initialization');
            return;
        }
        posthog.init(
            env.NEXT_PUBLIC_POSTHOG_KEY, {
            api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
            capture_pageview: 'history_change',
            capture_pageleave: true,
            capture_exceptions: true,
        })
    }, [])

    useEffect(() => {
        if (user) {
            try {
                posthog.identify(user.id, {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    displayName: user.displayName,
                    email: user.email,
                    avatar_url: user.avatarUrl,
                }, {
                    signup_date: new Date().toISOString(),
                })
            } catch (error) {
                console.error('Error identifying user:', error);
            }
        }
    }, [user])

    return (
        <PHProvider client={posthog}>
            {children}
        </PHProvider>
    )
})
