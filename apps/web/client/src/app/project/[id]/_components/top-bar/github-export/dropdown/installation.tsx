import { api } from '@/trpc/react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';

interface InstallationStepProps {
    isLoading: boolean;
    hasError: boolean;
    onInstalled: () => void;
}

export const InstallationStep = observer(({ isLoading, hasError, onInstalled }: InstallationStepProps) => {
    const generateInstallationUrl = api.github.generateInstallationUrl.useMutation();

    const handleInstallApp = async () => {
        try {
            const { url } = await generateInstallationUrl.mutateAsync();
            // Open GitHub App installation in new window
            const popup = window.open(url, 'github-install', 'width=600,height=700');
            
            // Listen for the popup to close
            const checkClosed = setInterval(() => {
                if (popup?.closed) {
                    clearInterval(checkClosed);
                    // Give a short delay for the installation to be processed
                    setTimeout(() => {
                        onInstalled();
                    }, 1000);
                }
            }, 1000);
        } catch (error) {
            console.error('Failed to generate installation URL:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center gap-4 py-8">
                <Icons.LoadingSpinner className="h-8 w-8 animate-spin text-foreground-secondary" />
                <p className="text-sm text-foreground-secondary">Checking GitHub App installation...</p>
            </div>
        );
    }

    if (!hasError) {
        return (
            <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex items-center gap-2 text-teal-600">
                    <Icons.Check className="h-5 w-5" />
                    <p className="text-sm font-medium">GitHub App installed</p>
                </div>
                <p className="text-xs text-foreground-secondary text-center">
                    Great! Your GitHub App is ready to use.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                    <Icons.GitHubLogo className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                    <h4 className="text-sm font-medium text-foreground-primary mb-1">
                        Install GitHub App
                    </h4>
                    <p className="text-xs text-foreground-secondary mb-3">
                        Connect Onlook to your GitHub account to create and sync repositories.
                    </p>
                    <ul className="text-xs text-foreground-secondary space-y-1 mb-4">
                        <li className="flex items-center gap-2">
                            <Icons.Check className="h-3 w-3 text-teal-500" />
                            Create repositories in your personal account or organizations
                        </li>
                        <li className="flex items-center gap-2">
                            <Icons.Check className="h-3 w-3 text-teal-500" />
                            Sync your project changes automatically
                        </li>
                        <li className="flex items-center gap-2">
                            <Icons.Check className="h-3 w-3 text-teal-500" />
                            Manage branches and commits
                        </li>
                    </ul>
                    
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800 mb-4">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                            ⚠️ Important: Repository Access
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            Make sure to grant access to <strong>"All repositories"</strong> during installation, 
                            or the specific repositories you want to work with. Limited access may prevent repository creation.
                        </p>
                    </div>
                </div>
            </div>

            <Button
                onClick={handleInstallApp}
                disabled={generateInstallationUrl.isPending}
                className="w-full"
                size="sm"
            >
                {generateInstallationUrl.isPending ? (
                    <>
                        <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                        Opening GitHub...
                    </>
                ) : (
                    <>
                        <Icons.GitHubLogo className="mr-2 h-4 w-4" />
                        Install GitHub App
                    </>
                )}
            </Button>
            
            <p className="text-xs text-foreground-secondary text-center">
                This will open GitHub in a new window to complete the installation.
            </p>
        </div>
    );
});