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
        isGitHubConnected,
        isGitHubAppInstalled,
        isCheckingConnection,
        isCheckingInstallation,
        connectionError,
        installationError,
        redirectToGitHubAppInstallation,
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

    const handleConnect = () => {
        if (isGitHubConnected && isGitHubAppInstalled) {
            // Already connected, proceed to next step
            nextStep();
        } else {
            // Need to install GitHub App
            redirectToGitHubAppInstallation();
        }
    };

    const getButtonText = () => {
        if (isCheckingConnection || isCheckingInstallation) {
            return 'Checking connection...';
        }
        if (isGitHubConnected && isGitHubAppInstalled) {
            return 'Continue';
        }
        return 'Install GitHub App';
    };

    const getButtonIcon = () => {
        if (isCheckingConnection || isCheckingInstallation) {
            return <Icons.LoadingSpinner className="w-4 h-4 mr-2 animate-spin" />;
        }
        return <Icons.GitHubLogo className="w-4 h-4 mr-2" />;
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
                <CardTitle className="text-xl font-normal">
                    {isGitHubConnected && isGitHubAppInstalled ? 'GitHub Connected' : 'Connect to GitHub'}
                </CardTitle>
                <CardDescription className="font-normal">
                    {isGitHubConnected && isGitHubAppInstalled
                        ? 'Your GitHub account is connected and ready to import repositories'
                        : 'Install the Onlook GitHub App to import your repositories'
                    }
                </CardDescription>
            </StepHeader>
            <StepContent>
                <motion.div
                    key="name"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full"
                >
                    <Separator orientation="horizontal" className="shrink-0 bg-border mb-6" />

                    {/* Show connection status or installation steps */}
                    {isGitHubConnected && isGitHubAppInstalled ? (
                        <>
                            {itemContent({
                                title: 'GitHub App Connected',
                                description: 'Onlook can now access your repositories',
                                icon: <Icons.CheckCircled className="w-5 h-5 text-green-500" />,
                            })}
                            {itemContent({
                                title: 'Ready to Import',
                                description: 'Select repositories from your GitHub account',
                                icon: <Icons.File className="w-5 h-5" />,
                            })}
                        </>
                    ) : (
                        <>
                            {itemContent({
                                title: 'Install the GitHub App',
                                description: 'This will redirect you to GitHub to install the Onlook app',
                                icon: <Icons.ExternalLink className="w-5 h-5" />,
                            })}
                            {itemContent({
                                title: 'Choose Repository Access',
                                description: 'Select which repositories Onlook can access during installation',
                                icon: <Icons.Key className="w-5 h-5" />,
                            })}
                            {itemContent({
                                title: 'Secure Permissions',
                                description: 'Onlook only gets the permissions you grant during installation',
                                icon: <Icons.LockClosed className="w-5 h-5" />,
                            })}
                        </>
                    )}

                    {/* Error messages */}
                    {(connectionError || installationError) && (
                        <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Icons.ExclamationTriangle className="w-5 h-5 text-red-400" />
                                <p className="text-red-400 font-medium">Connection Error</p>
                            </div>
                            <p className="text-red-300 text-sm mt-1">
                                {connectionError || installationError}
                            </p>
                        </div>
                    )}

                    <Separator orientation="horizontal" className="shrink-0 bg-border mt-6" />
                </motion.div>
            </StepContent>
            <StepFooter>
                <Button onClick={prevStep} variant="outline">
                    Cancel
                </Button>
                <Button
                    className="px-3 py-2"
                    onClick={handleConnect}
                    disabled={isCheckingConnection || isCheckingInstallation}
                >
                    {getButtonIcon()}
                    <span>{getButtonText()}</span>
                </Button>
            </StepFooter>
        </>
    );
};
