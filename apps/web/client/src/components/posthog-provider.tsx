"use client"

import { env } from "@/env"
import { observer } from "mobx-react-lite"
import posthog from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"
import { useEffect } from "react"
import { useUserManager } from "./store/user"

export const PostHogProvider = observer(({ children }: { children: React.ReactNode }) => {
    const userManager = useUserManager();

    useEffect(() => {
        posthog.init(
            env.NEXT_PUBLIC_POSTHOG_KEY, {
            api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
            capture_pageview: 'history_change',
            capture_pageleave: true,
            capture_exceptions: true,
        })
    }, [])

    useEffect(() => {
        if (userManager.user) {
            try {
                posthog.identify(userManager.user.id, {
                    name: userManager.user.name,
                    email: userManager.user.email,
                    avatar_url: userManager.user.avatarUrl,
                })
            } catch (error) {
                console.error('Error identifying user:', error);
            }
        }
    }, [userManager.user])

    return (
        <PHProvider client={posthog}>
            {children}
        </PHProvider>
    )
})
