import { useDomainsManager, useProjectManager } from '@/components/store/project';
import { HOSTING_DOMAIN } from '@onlook/constants';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { getValidSubdomain, getValidUrl, timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';

export const BaseDomain = observer(() => {
    const projectsManager = useProjectManager();
    const domainsManager = useDomainsManager();
    if (!projectsManager.project) {
        return null;
    }

    const baseDomain = domainsManager.domains.preview;
    const lastUpdated = baseDomain?.publishedAt ? timeAgo(baseDomain.publishedAt) : null;
    const baseUrl = baseDomain?.url
        ? `${getValidSubdomain(projectsManager.project.id)}.${HOSTING_DOMAIN}`
        : null;

    const openUrl = () => {
        if (!baseUrl) {
            console.error('No URL found');
            return;
        }

        const url = getValidUrl(baseUrl);
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-4 flex flex-col">
            <h2 className="text-lg">Base Domain</h2>
            <div className="space-y-2">
                <div className="flex justify-between items-center gap-2">
                    <div className="w-1/3">
                        <p className="text-regularPlus text-muted-foreground">URL</p>
                        <p className="text-small text-muted-foreground">
                            {lastUpdated ? `Updated ${lastUpdated} ago` : 'Not published'}
                        </p>
                    </div>
                    <div className="flex gap-2 flex-1">
                        <Input value={baseDomain?.url ?? ''} disabled className="bg-muted" />
                        <Button onClick={openUrl} variant="ghost" size="icon" className="text-sm">
                            <Icons.ExternalLink className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
});