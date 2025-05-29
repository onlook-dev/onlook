'use client';

import { useEffect } from 'react';

export default function AuthRedirect() {
    useEffect(() => {
        // Get the return URL from localStorage
        const returnUrl = localStorage.getItem('returnUrl') || '/';
        // Clear the return URL
        localStorage.removeItem('returnUrl');
        // Redirect to the return URL
        window.location.href = returnUrl;
    }, []);

    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-semibold mb-4">Redirecting...</h1>
                <p className="text-foreground-secondary">Please wait while we redirect you back.</p>
            </div>
        </div>
    );
} 