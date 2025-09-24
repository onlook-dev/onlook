'use client';

import Link from 'next/link';

import { Icons } from '@onlook/ui/icons';

export default function NotFound() {
    return (
        <main className="flex h-screen w-screen flex-1 flex-col items-center justify-center p-4 text-center">
            <div className="max-w-md space-y-6">
                <div className="space-y-2">
                    <h1 className="text-foreground-primary text-4xl font-bold tracking-tight">
                        404
                    </h1>
                    <h2 className="text-foreground-primary text-2xl font-semibold tracking-tight">
                        Page not found
                    </h2>
                    <p className="text-foreground-secondary">
                        {`The page you're looking for doesn't exist or has been moved.`}
                    </p>
                </div>

                <div className="flex justify-center">
                    <Link
                        href="/"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        <Icons.ArrowLeft className="h-4 w-4" />
                        Back to home
                    </Link>
                </div>
            </div>
        </main>
    );
}
