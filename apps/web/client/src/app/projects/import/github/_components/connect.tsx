'use client';

import { Button } from '@onlook/ui/button';
import { CardDescription, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { motion } from 'motion/react';
import { StepContent, StepFooter, StepHeader } from '../../steps';
import { useImportGithubProject } from '../_context/context';

export const ConnectGithub = () => {
    const {
        prevStep,
        nextStep,
        hasGitHubAppInstallation,
        redirectToGitHubAppInstallation,
        appInstallationError,
        isCheckingAppInstallation
    } = useImportGithubProject();

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

    return (
        <>
            <StepHeader>
                <div className="flex items-center gap-3">
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
            </StepHeader>
            <StepContent>
                <motion.div
                    key="name"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full text-sm"
                >
                    <Separator orientation="horizontal" className="shrink-0 bg-border mb-6" />
                    {itemContent({
                        title: hasGitHubAppInstallation
                            ? 'GitHub App already connected'
                            : 'Install Onlook GitHub App',
                        description: hasGitHubAppInstallation
                            ? 'You can access your repositories through the GitHub App'
                            : 'Get secure repository access with fine-grained permissions',
                        icon: hasGitHubAppInstallation
                            ? <Icons.Check className="w-5 h-5 text-green-500" />
                            : <Icons.GitHubLogo className="w-5 h-5" />,
                    })}
                    {appInstallationError && (
                        <div className="mt-4 p-3 bg-red-900 border border-red-800 rounded-md">
                            <div className="text-red-100 text-sm">{appInstallationError}</div>
                        </div>
                    )}
                    <Separator orientation="horizontal" className="shrink-0 bg-border mt-6" />
                </motion.div>
            </StepContent>
            <StepFooter>
                <Button onClick={prevStep} variant="outline">
                    Cancel
                </Button>

                {hasGitHubAppInstallation ? (
                    <Button className="px-3 py-2" onClick={nextStep}>
                        <Icons.ArrowRight className="w-4 h-4 mr-2" />
                        <span>Continue</span>
                    </Button>
                ) : (
                    <Button
                        className="px-3 py-2"
                        onClick={() => redirectToGitHubAppInstallation()}
                        disabled={isCheckingAppInstallation}
                    >
                        <Icons.GitHubLogo className="w-4 h-4 mr-2" />
                        <span>Install GitHub App</span>
                    </Button>
                )}
            </StepFooter>
        </>
    );
};
