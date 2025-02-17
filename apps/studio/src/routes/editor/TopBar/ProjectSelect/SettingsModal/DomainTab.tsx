import { useEditorEngine, useProjectsManager, useUserManager } from '@/components/Context';
import { UsagePlanType } from '@onlook/models/usage';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

export const DomainTab = observer(({ setOpen }: { setOpen: (open: boolean) => void }) => {
    const userManager = useUserManager();
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();

    const [isVerified] = useState(true); // Will be replaced with domain verification check
    const plan = userManager.subscription.plan;
    const url = projectsManager.hosting?.state.url
        ? `https://${projectsManager.hosting?.state.url}`
        : undefined;

    useEffect(() => {
        userManager.subscription.getPlanFromServer();
    }, []);

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h2 className="text-lg font-medium">Base Domain</h2>
                <div className="space-y-2">
                    <div className="flex justify-between items-center gap-2">
                        <div className="w-24">
                            <p className="text-regularPlus text-muted-foreground">URL</p>
                            <p className="text-small text-muted-foreground hidden">
                                Last updated 3 mins ago
                            </p>
                        </div>
                        <Input
                            value={projectsManager.hosting?.state.url ?? ''}
                            disabled
                            className="bg-muted"
                        />
                        <Button
                            onClick={() => {
                                window.open(url, '_blank');
                            }}
                            variant="ghost"
                            size="icon"
                            className="text-sm"
                        >
                            <Icons.ExternalLink className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Add divider */}
            <div className="border-t border-border" />

            <div className="space-y-4">
                <div className="flex items-center justify-start gap-3">
                    <h2 className="text-lg font-medium">Custom Domain</h2>
                    <div className="flex h-5 items-center space-x-2 bg-blue-500/20 dark:bg-blue-500 px-2 rounded-full">
                        <Icons.Sparkles className="h-4 w-4" />
                        <span className="text-xs">Pro</span>
                    </div>
                </div>

                {plan !== UsagePlanType.PRO ? (
                    <div
                        className={cn(
                            'rounded-md p-4 border bg-blue-600/10 text-blue-600 border-blue-600 dark:bg-blue-950 dark:border-blue-600 dark:text-blue-100',
                        )}
                    >
                        <p className="text-sm flex items-center gap-2">
                            You must be on Onlook Pro to use a custom Domain.
                            <Button
                                variant="link"
                                className={cn(
                                    'px-2 h-auto p-0 text-blue-600 hover:text-blue-700 dark:text-blue-100 dark:hover:text-blue-200 font-medium',
                                )}
                                onClick={() => {
                                    setOpen(false);
                                    editorEngine.isPlansOpen = true;
                                }}
                            >
                                Upgrade today!
                            </Button>
                        </p>
                    </div>
                ) : !isVerified ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-regularPlus text-muted-foreground">
                                        Custom URL
                                    </p>
                                </div>
                                <Input
                                    placeholder="Input your domain"
                                    className="bg-background w-2/3"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="space-y-2">
                                    <p className="text-regularPlus text-muted-foreground">
                                        Configure
                                    </p>
                                    <p className="text-small text-muted-foreground">
                                        Your DNS records must be set up with these values.
                                    </p>
                                </div>
                                <Button variant="secondary" size="sm" className="h-8 px-3 text-sm">
                                    Verify Setup
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 rounded-lg border p-4">
                            <div className="text-sm font-medium">Name</div>
                            <div className="text-sm font-medium">Type</div>
                            <div className="text-sm font-medium">Value</div>

                            <p className="text-sm">@</p>
                            <p className="text-sm">A</p>
                            <p className="text-sm">32.233.32.3</p>

                            <p className="text-sm">@</p>
                            <p className="text-sm">A</p>
                            <p className="text-sm">32.243.32.3</p>

                            <p className="text-sm">www</p>
                            <p className="text-sm">CNAME</p>
                            <p className="text-sm">onlook.live</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-regularPlus text-muted-foreground">
                                        Custom URL
                                    </p>
                                </div>
                                <Input value="cookieshop.com" disabled className="bg-muted w-2/3" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="space-y-2">
                                    <p className="text-regularPlus text-muted-foreground">
                                        Configure
                                    </p>
                                    <p className="text-small text-muted-foreground">
                                        Your DNS records must be set up with these values.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <Icons.CheckCircled className="h-4 w-4 text-green-500" />
                                        <span className="text-xs text-muted-foreground">
                                            Verified
                                        </span>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <Icons.DotsVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem className="hover:bg-muted focus:bg-muted cursor-pointer">
                                                <Icons.Reset className="mr-2 h-4 w-4" />
                                                Reconfigure DNS
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="hover:bg-destructive/10 focus:bg-destructive/10 text-destructive cursor-pointer">
                                                <Icons.Trash className="mr-2 h-4 w-4" />
                                                Remove Domain
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 rounded-lg border p-4">
                            <div className="text-sm font-medium">Name</div>
                            <div className="text-sm font-medium">Type</div>
                            <div className="text-sm font-medium">Value</div>

                            <p className="text-sm">@</p>
                            <p className="text-sm">A</p>
                            <p className="text-sm">32.233.32.3</p>

                            <p className="text-sm">@</p>
                            <p className="text-sm">A</p>
                            <p className="text-sm">32.243.32.3</p>

                            <p className="text-sm">www</p>
                            <p className="text-sm">CNAME</p>
                            <p className="text-sm">onlook.live</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default DomainTab;
