'use client';

import { Button } from "@onlook/ui-v4/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <div className="text-center space-y-6">
                <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100">500</h1>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Something went wrong</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    An unexpected error occurred. We've been notified and are working to fix it.
                </p>
                <div className="flex gap-4 justify-center mt-4">
                    <Button
                        onClick={() => reset()}
                        variant="outline"
                    >
                        Try Again
                    </Button>
                    <Button
                        onClick={() => router.push('/')}
                    >
                        Home
                    </Button>
                </div>
            </div>
        </div>
    );
}