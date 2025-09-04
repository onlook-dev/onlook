"use client"

import { env } from "@/env"
import { api } from "@/trpc/react"
import { observer } from "mobx-react-lite"
import Gleap from "gleap"
import { useEffect } from "react"

export const GleapProvider = observer(({ children }: { children: React.ReactNode }) => {
    const { data: user } = api.user.get.useQuery();

    useEffect(() => {
        console.log('GleapProvider: Checking environment key...', {
            keyExists: !!env.NEXT_PUBLIC_GLEAP_KEY,
            keyValue: env.NEXT_PUBLIC_GLEAP_KEY ? 'SET' : 'NOT_SET'
        });
        
        if (!env.NEXT_PUBLIC_GLEAP_KEY) {
            console.warn('Gleap key is not set, skipping initialization');
            return;
        }
        
        console.log('GleapProvider: Initializing Gleap...');
        try {
            Gleap.initialize(env.NEXT_PUBLIC_GLEAP_KEY);
            console.log('GleapProvider: Gleap initialized successfully');
        } catch (error) {
            console.error('GleapProvider: Error initializing Gleap:', error);
        }
    }, [])

    useEffect(() => {
        if (user) {
            try {
                Gleap.identify(user.id, {
                    name: user.displayName || `${user.firstName} ${user.lastName}`.trim(),
                    email: user.email,
                });
            } catch (error) {
                console.error('Error identifying user with Gleap:', error);
            }
        }
    }, [user])

    return <>{children}</>
})
