import { useProjectsManager } from '@/components/Context';
import { invokeMainChannel } from '@/lib/utils';
import { HOSTING_DOMAIN, MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { getValidSubdomain, getValidUrl, timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';

const BaseDomain = observer(() => {
    const projectsManager = useProjectsManager();
    if (!projectsManager.project) {
        return null;
    }

    const baseDomain = projectsManager.project?.domains?.base;
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
        invokeMainChannel(MainChannels.OPEN_EXTERNAL_WINDOW, url);
    };

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-medium">Base Domain</h2>
            <div className="space-y-2">
                <div className="flex justify-between items-center gap-2">
                    <div className="w-1/3">
                        <p className="text-regularPlus text-muted-foreground">URL</p>
                        <p className="text-small text-muted-foreground">
                            Updated {lastUpdated} ago
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

export default BaseDomain;
