import { useDomainsManager, useProjectManager } from '@/components/store/project';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { timeAgo } from '@onlook/utility';

export const Verified = () => {
    const domainsManager = useDomainsManager();
    const customDomain = domainsManager.domains.custom;
    const lastUpdated = customDomain?.publishedAt ? timeAgo(customDomain.publishedAt) : null;
    const baseUrl = customDomain?.url;

    function removeDomain() {
        if (!domainsManager) {
            console.error('No domains manager found');
            return;
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
                <div className="w-1/3">
                    <p className="text-regularPlus text-muted-foreground">Custom URL</p>
                    <p className="text-small text-muted-foreground">Updated {lastUpdated} ago</p>
                </div>
                <div className="flex gap-2 flex-1">
                    <Input value={baseUrl ?? ''} disabled className="bg-muted" />
                    <div className="flex items-center gap-1">
                        <Icons.CheckCircled className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-muted-foreground">Verified</span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Icons.DotsVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="hover:bg-muted focus:bg-muted cursor-pointer hidden">
                                <Icons.Reset className="mr-2 h-4 w-4" />
                                Reconfigure DNS
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={removeDomain}
                                className="hover:bg-destructive/10 focus:bg-destructive/10 text-red-500 cursor-pointer"
                            >
                                <Icons.Trash className="mr-2 h-4 w-4" />
                                Remove Domain
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
};