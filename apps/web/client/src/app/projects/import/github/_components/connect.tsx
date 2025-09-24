'use client';

import { motion } from 'motion/react';

import { Button } from '@onlook/ui/button';
import { CardDescription, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';

import { useImportGithubProject } from '../_context';
import { StepContent, StepFooter, StepHeader } from '../../steps';

export const ConnectGithub = () => {
    const { prevStep, nextStep, installation } = useImportGithubProject();

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
                <div className="flex w-full flex-col">
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
                    <div className="rounded-lg bg-gray-700 p-3">
                        <Icons.OnlookLogo className="h-6 w-6" />
                    </div>
                    <Icons.DotsHorizontal className="h-6 w-6" />
                    <div className="rounded-lg bg-gray-700 p-3">
                        <Icons.GitHubLogo className="h-6 w-6" />
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
                    <Separator orientation="horizontal" className="bg-border mb-6 shrink-0" />
                    {itemContent({
                        title: installation.hasInstallation
                            ? 'GitHub App already connected'
                            : 'Install Onlook GitHub App',
                        description: installation.hasInstallation
                            ? 'You can access your repositories through the GitHub App'
                            : 'Get secure repository access with fine-grained permissions',
                        icon: installation.hasInstallation ? (
                            <Icons.Check className="h-5 w-5 text-green-500" />
                        ) : (
                            <Icons.GitHubLogo className="h-5 w-5" />
                        ),
                    })}
                    {installation.error && (
                        <div className="mt-4 rounded-md border border-red-800 bg-red-900 p-3">
                            <div className="text-sm text-red-100">{installation.error}</div>
                        </div>
                    )}
                    <Separator orientation="horizontal" className="bg-border mt-6 shrink-0" />
                </motion.div>
            </StepContent>
            <StepFooter>
                <Button onClick={prevStep} variant="outline">
                    Cancel
                </Button>

                {installation.hasInstallation ? (
                    <div className="flex gap-2">
                        <Button
                            size="icon"
                            variant="outline"
                            className="py-2"
                            onClick={() => installation.redirectToInstallation()}
                        >
                            <Icons.Gear className="h-4 w-4" />
                        </Button>
                        <Button className="px-3 py-2" onClick={nextStep}>
                            <Icons.ArrowRight className="mr-2 h-4 w-4" />
                            <span>Continue</span>
                        </Button>
                    </div>
                ) : (
                    <Button
                        className="px-3 py-2"
                        onClick={() => installation.redirectToInstallation()}
                        disabled={installation.isChecking}
                    >
                        <Icons.GitHubLogo className="mr-2 h-4 w-4" />
                        <span>Install GitHub App</span>
                    </Button>
                )}
            </StepFooter>
        </>
    );
};
