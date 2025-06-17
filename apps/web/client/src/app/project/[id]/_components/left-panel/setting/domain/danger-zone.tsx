import { useDomainsManager } from '@/components/store/project';
import { DomainType } from '@onlook/models';

import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';

export const DangerZone = observer(() => {
    const domainsManager = useDomainsManager();

    const baseDomain = domainsManager.domains.preview;
    const isBaseDomainUnpublishing = baseDomain?.type === DomainType.PREVIEW;

    const customDomain = domainsManager.domains.custom;
    const isCustomDomainUnpublishing = customDomain?.type === DomainType.CUSTOM;


    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-lg">Danger Zone</h2>
            <div className="flex flex-col gap-4">
                <div className="flex flex-row gap-2 items-center">
                    <p className="text-sm text-muted-foreground">
                        {!baseDomain
                            ? 'Your domain is not published'
                            : `Unpublish from ${baseDomain.url}`}
                    </p>
                    <Button
                        onClick={() => domainsManager.unpublish(DomainType.PREVIEW)}
                        className="ml-auto"
                        size="sm"
                        variant="destructive"
                        disabled={!baseDomain || isBaseDomainUnpublishing}
                    >
                        {isBaseDomainUnpublishing ? 'Unpublishing...' : 'Unpublish'}
                    </Button>
                </div>
                {customDomain && (
                    <div className="flex flex-row gap-2 items-center">
                        <p className="text-sm text-muted-foreground">
                            Unpublish from {customDomain.url}
                        </p>
                        <Button
                            onClick={() => domainsManager.unpublish(DomainType.CUSTOM)}
                            className="ml-auto"
                            size="sm"
                            variant="destructive"
                            disabled={
                                isCustomDomainUnpublishing || !customDomain
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