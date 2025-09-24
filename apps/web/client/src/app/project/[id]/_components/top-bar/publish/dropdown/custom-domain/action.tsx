import stripAnsi from 'strip-ansi';

import { DeploymentStatus } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';

import { UrlSection } from '../url';
import { useCustomDomainContext } from './provider';

export const ActionSection = () => {
    const { customDomain, deployment, publish, retry, isDeploying, isLoading } =
        useCustomDomainContext();
    const failedOrCancelled =
        deployment?.status === DeploymentStatus.FAILED ||
        deployment?.status === DeploymentStatus.CANCELLED;
    if (!customDomain) {
        return 'Something went wrong';
    }

    return (
        <div className="flex w-full flex-col gap-2">
            <UrlSection url={customDomain.url} isCopyable={false} />
            {!failedOrCancelled && (
                <Button
                    onClick={publish}
                    variant="outline"
                    className={cn(
                        'w-full rounded-md p-3',
                        !customDomain.publishedAt && 'bg-blue-400 text-white hover:bg-blue-500',
                    )}
                    disabled={isDeploying || isLoading}
                >
                    {isLoading && <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />}
                    {deployment?.updatedAt ? 'Update' : `Publish to ${customDomain.url}`}
                </Button>
            )}
            {failedOrCancelled && (
                <div className="flex w-full flex-col gap-2">
                    {deployment?.error && (
                        <p className="max-h-20 overflow-y-auto text-red-500">
                            {stripAnsi(deployment?.error)}
                        </p>
                    )}
                    <Button variant="outline" className="w-full rounded-md p-3" onClick={retry}>
                        Try Updating Again
                    </Button>
                </div>
            )}
        </div>
    );
};
