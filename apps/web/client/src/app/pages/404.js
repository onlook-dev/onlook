'use client';

import { Button } from "@onlook/ui-v4/button";
import { useRouter } from "next/navigation";

export const metadata = {
    title: '404: Page Not Found - Onlook',
    description: 'The requested page could not be found.',
};

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <div className="text-center space-y-6">
                <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100">404</h1>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Page Not Found</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    The page you are looking for does not exist or has been moved.
                </p>
                <div className="flex gap-4 justify-center mt-4">
                    <Button
                        onClick={() => router.back()}
                        variant="outline"
                    >
                        Go Back
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