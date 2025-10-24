'use client';

import { Routes } from '@/utils/constants';
import { Button } from '@onlook/ui/button';
import { CardDescription, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { MotionCard } from '@onlook/ui/motion-card';
import { Separator } from '@onlook/ui/separator';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { connectGitHubRepos } from '../actions';

export const OAuthConnect = () => {
    const router = useRouter();
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            await connectGitHubRepos();
        } catch (error) {
            console.error('Error connecting to GitHub:', error);
            setIsConnecting(false);
        }
    };

    const handleCancel = () => {
        router.push(Routes.IMPORT_PROJECT);
    };

    return (
        <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-[30rem] backdrop-blur-md bg-background/30 overflow-hidden"
        >
                        <div className="flex flex-col p-6 space-y-6">
                            {/* Header */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-gray-700 rounded-lg">
                                        <Icons.OnlookLogo className="w-6 h-6" />
                                    </div>
                                    <Icons.DotsHorizontal className="w-6 h-6" />
                                    <div className="p-3 bg-gray-700 rounded-lg">
                                        <Icons.GitHubLogo className="w-6 h-6" />
                                    </div>
                                </div>
                                <CardTitle className="text-xl font-normal">
                                    Connect to GitHub
                                </CardTitle>
                                <CardDescription className="font-normal text-center">
                                    Grant Onlook access to your GitHub repositories
                                </CardDescription>
                            </div>

                            <Separator orientation="horizontal" className="shrink-0 bg-border" />

                            {/* Content */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col gap-4 text-sm"
                            >
                                <div className="flex gap-3">
                                    <Icons.Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Browse your repositories</p>
                                        <p className="text-gray-200">
                                            See all repositories you have access to
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Icons.Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Read repository contents</p>
                                        <p className="text-gray-200">
                                            Access your code to enable visual editing
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Icons.Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Secure OAuth access</p>
                                        <p className="text-gray-200">
                                            Managed by GitHub with standard OAuth flow
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            <Separator orientation="horizontal" className="shrink-0 bg-border" />

                            {/* Footer */}
                            <div className="flex justify-between">
                                <Button onClick={handleCancel} variant="outline">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleConnect}
                                    disabled={isConnecting}
                                    className="px-3 py-2"
                                >
                                    <Icons.GitHubLogo className="w-4 h-4 mr-2" />
                                    <span>
                                        {isConnecting ? 'Connecting...' : 'Connect to GitHub'}
                                    </span>
                                </Button>
                            </div>
                        </div>
        </MotionCard>
    );
};
