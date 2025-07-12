import { DeploymentStatus } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { cn } from '@onlook/ui/utils';
import stripAnsi from 'strip-ansi';
import { UrlSection } from '../url';
import { useCustomDomainContext } from './provider';

export const ActionSection = () => {
    const { customDomain, deployment, publish, retry, isDeploying } = useCustomDomainContext();

    if (!customDomain) {
        return 'Something went wrong';
    }

    return (
        <div className="w-full flex flex-col gap-2">
            <UrlSection url={customDomain.url} isCopyable={false} />
            {deployment?.status !== DeploymentStatus.FAILED && (
                <Button
                    onClick={publish}
                    variant="outline"
                    className={cn(
                        'w-full rounded-md p-3',
                        !customDomain.publishedAt &&
                        'bg-blue-400 hover:bg-blue-500 text-white',
                    )}
                    disabled={isDeploying}
                >
                    {deployment?.updatedAt ? 'Update' : `Publish to ${customDomain.url}`}
                </Button>
            )}
            {deployment?.status === DeploymentStatus.FAILED && (
                <div className="w-full flex flex-col gap-2">
                    {deployment?.error && <p className="text-red-500 max-h-20 overflow-y-auto">{stripAnsi(deployment?.error)}</p>}
                    <Button
                        variant="outline"
                        className="w-full rounded-md p-3"
                        onClick={retry}
                    >
                        Try Updating Again
                    </Button>
                </div>
            )}
        </div>
    );
};
