'use client';

import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/client';
import { openFeedbackWidget, resetTelemetry } from '@/utils/telemetry';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { useRouter } from 'next/navigation';

export default function DemoOnlyPage() {
    const router = useRouter();

    const handleBookDemo = () => {
        window.open('https://calendly.com/onlook/demo', '_blank', 'noopener,noreferrer');
    };

    const handleGoHome = () => {
        router.push(Routes.HOME);
    };

    const handleSignOut = async () => {
        const supabase = createClient();
        void resetTelemetry();
        await supabase.auth.signOut();
        router.push(Routes.HOME);
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <button
                aria-label="Open help"
                className="fixed bottom-4 left-4 w-8 h-8 rounded-full flex items-center justify-center text-foreground-tertiary hover:text-foreground-secondary bg-background-secondary hover:bg-background-tertiary transition-colors"
                onClick={() => void openFeedbackWidget()}
            >
                <Icons.QuestionMarkCircled className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center gap-6 text-center max-w-2xl px-6">
                <div className="flex flex-col items-center gap-4">
                    <h1 className="text-4xl font-thin">
                        Onlook is in Limited Access
                    </h1>
                    <p className="text-foreground-secondary text-regular max-w-lg text-balance">
                        Thanks for your interest in Onlook! We're currently in a limited access period.{' '}
                        Book a demo with our team to get started, or{' '}
                        <a
                            href="https://github.com/onlook-dev/onlook"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                        >
                            browse our repo
                        </a>
                        {' '}to self-host.
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
                    <Button
                        onClick={handleGoHome}
                        size="lg"
                        variant="outline"
                    >
                        Back to Home
                    </Button>
                    <Button
                        onClick={handleBookDemo}
                        size="lg"
                        className="bg-foreground-primary text-background-primary hover:bg-foreground-hover"
                    >
                        Book a Demo
                    </Button>
                </div>

                <div className="mt-8 pt-8 border-t border-border w-full">
                    <p className="text-sm text-foreground-tertiary">
                        Already have an account?{' '}
                        <button
                            onClick={handleSignOut}
                            className="text-primary hover:underline"
                        >
                            Sign out and try a different email
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

