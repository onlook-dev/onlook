'use client';

import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type CallbackState = 'loading' | 'success' | 'error';

export default function GitHubInstallCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [state, setState] = useState<CallbackState>('loading');
    const [message, setMessage] = useState<string>('');

    const handleInstallationCallback = api.github.handleInstallationCallbackUrl.useMutation();

    useEffect(() => {
        const installationId = searchParams.get('installation_id');
        const setupAction = searchParams.get('setup_action');
        const stateParam = searchParams.get('state');

        console.log('GitHub installation callback:', { installationId, setupAction, state: stateParam });

        if (!installationId) {
            setState('error');
            setMessage('Missing installation_id parameter');
            return;
        }

        if (!setupAction) {
            setState('error');
            setMessage('Missing setup_action parameter');
            return;
        }

        if (!stateParam) {
            setState('error');
            setMessage('Missing state parameter');
            return;
        }

        // Call the TRPC mutation to handle the callback
        handleInstallationCallback.mutate(
            {
                installationId,
                setupAction: setupAction,
                state: stateParam,
            },
            {
                onSuccess: (data) => {
                    setState('success');
                    setMessage(data.message);
                    console.log('GitHub App installation completed:', data);

                    setTimeout(() => {
                        // Close the tab since we are using a new tab
                        window.close();
                    }, 3000);
                },
                onError: (error) => {
                    setState('error');
                    setMessage(error.message);
                    console.error('GitHub App installation callback failed:', error);
                },
            }
        );
    }, []);

    const StateContainer = ({
        indicatorColor,
        indicatorIcon: IndicatorIcon,
        indicatorAnimated = false,
        iconAnimated = false,
        title,
        description,
        isError = false,
        actions
    }: {
        indicatorColor: string;
        indicatorIcon: React.ComponentType<{ className?: string }>;
        indicatorAnimated?: boolean;
        iconAnimated?: boolean;
        title: string;
        description: string;
        isError?: boolean;
        actions?: React.ReactNode;
    }) => (
        <div className="flex flex-col items-center gap-2 w-full">
            {iconAnimated ? (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                >
                    <div className={`relative w-16 h-16 rounded-full ${indicatorColor} flex items-center justify-center mb-2`}>
                        {indicatorAnimated && (
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white/30 animate-spin" />
                        )}
                        <IndicatorIcon className="w-8 h-8 text-white" />
                    </div>
                </motion.div>
            ) : (
                <div className={`relative w-16 h-16 rounded-full ${indicatorColor} flex items-center justify-center mb-2`}>
                    {indicatorAnimated && (
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white/30 animate-spin" />
                    )}
                    <IndicatorIcon className="w-8 h-8 text-white" />
                </div>
            )}
            <CardTitle className="text-xl text-foreground-primary">
                {title}
            </CardTitle>
            <CardDescription className={`max-w-sm ${isError ? 'text-gray-400' : 'text-foreground-secondary/90'}`}>
                {description}
            </CardDescription>
            {actions}
        </div>
    );

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
            <div className="w-full max-w-md">
                {/* Header - Above Card */}
                <div className="flex items-center gap-4 mb-8 justify-center">
                    <div className="p-4 bg-gray-800 rounded-xl">
                        <Icons.OnlookLogo className="w-8 h-8 text-white" />
                    </div>
                    <Icons.DotsHorizontal className="w-8 h-8 text-gray-400" />
                    <div className="p-4 bg-gray-800 rounded-xl">
                        <Icons.GitHubLogo className="w-8 h-8 text-white" />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={state}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Card className="bg-gray-900 border-gray-800 shadow-2xl">
                            <CardContent className="p-8">
                                <div className="flex flex-col items-center text-center">
                                    {/* Loading State */}
                                    {state === 'loading' && (
                                        <StateContainer
                                            indicatorColor="bg-gray-800"
                                            indicatorIcon={Icons.GitHubLogo}
                                            indicatorAnimated={true}
                                            title="Connecting to GitHub"
                                            description="We're setting up your integration"
                                        />
                                    )}

                                    {/* Success State */}
                                    {state === 'success' && (
                                        <StateContainer
                                            indicatorColor="bg-green-500"
                                            indicatorIcon={Icons.CheckCircled}
                                            iconAnimated={true}
                                            title="All set!"
                                            description="Your GitHub account is now connected"
                                        />
                                    )}

                                    {/* Error State */}
                                    {state === 'error' && (
                                        <StateContainer
                                            indicatorColor="bg-red-500"
                                            indicatorIcon={Icons.ExclamationTriangle}
                                            iconAnimated={true}
                                            title="Something went wrong"
                                            description={message}
                                            isError={true}
                                            actions={
                                                <div className="flex flex-col gap-3 w-full">
                                                    <Button
                                                        variant="default"
                                                        onClick={() => window.location.reload()}
                                                        className="w-full"
                                                    >
                                                        Try Again
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => router.push(Routes.IMPORT_GITHUB)}
                                                        className="w-full"
                                                    >
                                                        Return to Import
                                                    </Button>
                                                </div>
                                            }
                                        />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}