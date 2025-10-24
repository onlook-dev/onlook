'use client';

import { useRouter } from 'next/navigation';
import localforage from 'localforage';
import { motion } from 'motion/react';

import { Button } from '@onlook/ui/button';
import { CardDescription, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { MotionCard } from '@onlook/ui/motion-card';
import { Separator } from '@onlook/ui/separator';

import { LocalForageKeys, Routes } from '@/utils/constants';
import { connectGitHubOAuth } from '../actions';

type OAuthConnectProps = {
    error?: string;
};

export const OAuthConnect = ({ error }: OAuthConnectProps) => {
    const router = useRouter();

    const handleConnect = async () => {
        await localforage.setItem(LocalForageKeys.RETURN_URL, Routes.IMPORT_GITHUB);
        await connectGitHubOAuth();
    };

    return (
        <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-background/30 w-[30rem] overflow-hidden backdrop-blur-md"
        >
            <div className="flex flex-col space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-gray-700 p-3">
                            <Icons.OnlookLogo className="h-6 w-6" />
                        </div>
                        <Icons.DotsHorizontal className="h-6 w-6" />
                        <div className="rounded-lg bg-gray-700 p-3">
                            <Icons.GitHubLogo className="h-6 w-6" />
                        </div>
                    </div>
                    <CardTitle className="text-xl font-normal">Connect to GitHub</CardTitle>
                    <CardDescription className="text-center font-normal">
                        Grant Onlook access to your GitHub repositories
                    </CardDescription>
                </div>

                <Separator orientation="horizontal" className="bg-border shrink-0" />

                {/* Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col gap-4 text-sm"
                >
                    <div className="flex gap-3">
                        <Icons.Check className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                        <div>
                            <p className="font-medium">Browse your repositories</p>
                            <p className="text-gray-200">See all repositories you have access to</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Icons.Check className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                        <div>
                            <p className="font-medium">Read repository contents</p>
                            <p className="text-gray-200">
                                Access your code to enable visual editing
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Icons.Check className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                        <div>
                            <p className="font-medium">Secure OAuth access</p>
                            <p className="text-gray-200">
                                Managed by GitHub with standard OAuth flow
                            </p>
                        </div>
                    </div>
                </motion.div>

                <Separator orientation="horizontal" className="bg-border shrink-0" />

                {/* Error Message */}
                {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                        <Icons.ExclamationTriangle className="h-5 w-5 text-red-500 shrink-0" />
                        <p className="text-sm text-red-200">
                            {error === 'oauth_failed'
                                ? 'Failed to connect to GitHub. Please try again.'
                                : 'An error occurred. Please try again.'}
                        </p>
                    </div>
                )}

                {/* Footer */}
                <div className="flex justify-between">
                    <Button onClick={() => router.push(Routes.IMPORT_PROJECT)} variant="outline">
                        Cancel
                    </Button>
                    <Button onClick={handleConnect} className="px-3 py-2">
                        <Icons.GitHubLogo className="mr-2 h-4 w-4" />
                        Connect to GitHub
                    </Button>
                </div>
            </div>
        </MotionCard>
    );
};
