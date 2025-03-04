import { useProjectsManager } from '@/components/Context';
import { PublishStatus } from '@onlook/models/hosting';
import { DomainType } from '@onlook/models/projects';
import { Button } from '@onlook/ui/button';
import { toast } from '@onlook/ui/use-toast';
import { observer } from 'mobx-react-lite';

const DangerZone = observer(() => {
    const projectsManager = useProjectsManager();

    const baseDomain = projectsManager.project?.domains?.base;
    const baseDomainManager = projectsManager.domains?.base;
    const isBaseDomainUnpublishing = baseDomainManager?.state.status === PublishStatus.LOADING;

    const customDomain = projectsManager.project?.domains?.custom;
    const customDomainManager = projectsManager.domains?.custom;
    const isCustomDomainUnpublishing = customDomainManager?.state.status === PublishStatus.LOADING;

    const unpublish = async (type: DomainType) => {
        const manager = type === DomainType.BASE ? baseDomainManager : customDomainManager;
        if (!manager) {
            console.error('No domain manager found');
            return;
        }

        const success = await manager.unpublish();

        if (!success) {
            toast({
                title: 'Failed to unpublish project',
                description: 'Please try again.',
                variant: 'destructive',
            });
        } else {
            toast({
                title: 'Project unpublished',
                description: 'Your project is no longer publicly accessible.',
            });
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-lg">Danger Zone</h2>
            <div className="flex flex-col gap-4">
                <div className="flex flex-row gap-2 items-center">
                    <p className="text-sm text-muted-foreground">
                        {!baseDomain || !baseDomainManager
                            ? 'Your domain is not published'
                            : `Unpublish from ${baseDomain.url}`}
                    </p>
                    <Button
                        onClick={() => unpublish(DomainType.BASE)}
                        className="ml-auto"
                        size="sm"
                        variant="destructive"
                        disabled={!baseDomain || !baseDomainManager || isBaseDomainUnpublishing}
                    >
                        {isBaseDomainUnpublishing ? 'Unpublishing...' : 'Unpublish'}
                    </Button>
                </div>
                {customDomain && customDomainManager && (
                    <div className="flex flex-row gap-2 items-center">
                        <p className="text-sm text-muted-foreground">
                            Unpublish from {customDomain.url}
                        </p>
                        <Button
                            onClick={() => unpublish(DomainType.CUSTOM)}
                            className="ml-auto"
                            size="sm"
                            variant="destructive"
                            disabled={
                                isCustomDomainUnpublishing || !customDomain || !customDomainManager
                            }
                        >
                            {isCustomDomainUnpublishing ? 'Unpublishing...' : 'Unpublish'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
});

export default DangerZone;
