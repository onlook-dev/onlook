'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import localforage from 'localforage';

import { LocalForageKeys } from '@/utils/constants';
import { sanitizeReturnUrl } from '@/utils/url';

export default function AuthRedirect() {
    const router = useRouter();

    useEffect(() => {
        const getReturnUrl = async () => {
            const returnUrl = await localforage.getItem<string>(LocalForageKeys.RETURN_URL);
            await localforage.removeItem(LocalForageKeys.RETURN_URL);
            const sanitizedUrl = sanitizeReturnUrl(returnUrl);
            router.replace(sanitizedUrl);
        };
        getReturnUrl();
    }, [router]);

    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <div className="text-center">
                <h1 className="mb-4 text-2xl font-semibold">Redirecting...</h1>
                <p className="text-foreground-secondary">Please wait while we redirect you back.</p>
            </div>
        </div>
    );
}
