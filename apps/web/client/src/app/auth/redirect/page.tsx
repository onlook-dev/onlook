'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthRedirect() {
    const router = useRouter();

    useEffect(() => {
        const returnUrl = localStorage.getItem('returnUrl') || '/';
        localStorage.removeItem('returnUrl');
        router.push(returnUrl);
    }, [router]);

    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-semibold mb-4">Redirecting...</h1>
                <p className="text-foreground-secondary">Please wait while we redirect you back.</p>
            </div>
        </div>
    );
} 