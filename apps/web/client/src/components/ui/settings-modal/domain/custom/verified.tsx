import { useState } from 'react';

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

import { useDomainVerification } from './use-domain-verification';

export const Verified = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { customDomain, removeVerifiedDomain } = useDomainVerification();

    if (!customDomain) {
        return <div>No custom domain found</div>;
    }

    const baseUrl = customDomain.url;
    const lastUpdated = customDomain.publishedAt ? timeAgo(customDomain.publishedAt) : null;

    async function removeDomain() {
        setIsLoading(true);
        await removeVerifiedDomain(baseUrl);
        setIsLoading(false);
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <div className="w-1/3">
                    <p className="text-small text-muted-foreground">Updated {lastUpdated} ago</p>
                </div>
                <div className="flex flex-1 gap-2">
                    <Input value={baseUrl ?? ''} readOnly className="bg-muted" />
                    <div className="flex items-center gap-1">
                        <Icons.CheckCircled className="h-4 w-4 text-green-500" />
                        <span className="text-xs">Verified</span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Icons.DotsVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={removeDomain}
                                className="hover:bg-destructive/10 focus:bg-destructive/10 cursor-pointer text-red-500"
                                disabled={isLoading}
                            >
                                {isLoading && (
                                    <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                                )}
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
