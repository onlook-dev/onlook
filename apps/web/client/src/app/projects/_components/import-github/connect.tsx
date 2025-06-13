import { MotionConfig } from 'motion/react';

import { CardDescription } from '@onlook/ui/card';
import { CardTitle } from '@onlook/ui/card';
import { AnimatePresence } from 'motion/react';

import { Button } from '@onlook/ui/button';
import { motion } from 'motion/react';
import { Icons } from '@onlook/ui/icons';
import type { StepComponent } from '../with-step-props';
import { useEffect, useState } from 'react';
import { useImportGithubProject } from './context';
import { Separator } from '@onlook/ui/separator';

const ConnectGithub: StepComponent = ({
    variant,
}: {
    variant: 'header' | 'content' | 'footer';
}) => {
    const { prevStep, nextStep } = useImportGithubProject();

    const renderHeader = () => {
        return (
            <>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gray-700 rounded-lg">
                        <Icons.OnlookLogo className="w-6 h-6" />
                    </div>
                    <Icons.DotsHorizontal className="w-6 h-6" />
                    <div className="p-3 bg-gray-700 rounded-lg">
                        <Icons.GitHubLogo className="w-6 h-6" />
                    </div>
                </div>
                <CardTitle className="text-xl font-normal">{'Connect to GitHub'}</CardTitle>
                <CardDescription className="font-normal">
                    {'Work with real code directly in Onlook'}
                </CardDescription>
            </>
        );
    };

    const itemContent = ({
        title,
        description,
        icon,
    }: {
        title: string;
        description: string;
        icon: React.ReactNode;
    }) => {
        return (
            <div className="flex">
                <div className="p-3">{icon}</div>
                <div className="flex flex-col w-full">
                    <p className="font-medium">{title}</p>
                    <p className="text-gray-200">{description}</p>
                </div>
            </div>
        );
    };
    const renderContent = () => (
        <MotionConfig transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
            <AnimatePresence mode="popLayout">
                <motion.div
                    key="name"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full gap-6 flex flex-col"
                >
                    <Separator orientation="horizontal" className="shrink-0 bg-border" />
                    {itemContent({
                        title: 'This page will redirect to GitHub',
                        description: 'Sign in and confirm permissions in GitHub',
                        icon: <Icons.ExternalLink className="w-5 h-5" />,
                    })}
                    {itemContent({
                        title: 'You set what Onlook can access',
                        description: 'Onlook is strictly limited to the permissions you set',
                        icon: <Icons.Key className="w-5 h-5" />,
                    })}
                    {itemContent({
                        title: 'You’re in control',
                        description: 'Sign in and confirm permissions in GitHub',
                        icon: <Icons.LockClosed className="w-5 h-5" />,
                    })}
                    <Separator orientation="horizontal" className="shrink-0 bg-border" />
                </motion.div>
            </AnimatePresence>
        </MotionConfig>
    );
    const renderFooter = () => {
        return (
            <div className="flex flex-row w-full justify-between">
                <Button onClick={prevStep} variant="outline">
                    Cancel
                </Button>
                <Button className="px-3 py-2" onClick={nextStep}>
                    <Icons.GitHubLogo className="w-4 h-4 mr-2" />
                    <span>Continue to GitHub</span>
                </Button>
            </div>
        );
    };
    switch (variant) {
        case 'header':
            return renderHeader();
        case 'content':
            return renderContent();
        case 'footer':
            return renderFooter();
    }
};

ConnectGithub.Header = () => <ConnectGithub variant="header" />;
ConnectGithub.Content = () => <ConnectGithub variant="content" />;
ConnectGithub.Footer = () => <ConnectGithub variant="footer" />;

ConnectGithub.Header.displayName = 'ConnectGithub.Header';
ConnectGithub.Content.displayName = 'ConnectGithub.Content';
ConnectGithub.Footer.displayName = 'ConnectGithub.Footer';

export { ConnectGithub };
