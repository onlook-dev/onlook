import * as React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@onlook/ui/dialog';
import { Button } from '@onlook/ui/button';
import { Input } from '@onlook/ui/input';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

export const SettingsModal = ({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) => {
    const [activeTab, setActiveTab] = React.useState('domain');
    const [isPro] = React.useState(false); // Will be replaced with actual pro check
    const [isVerified] = React.useState(false); // Will be replaced with domain verification check

    // Reset state when dialog closes
    React.useEffect(() => {
        if (!open) {
            setActiveTab('domain');
        }
    }, [open]);
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <div className="flex flex-col h-full">
                    {/* Top bar */}
                    <div className="flex justify-between items-center border-b border-border pb-4">
                        <DialogTitle>Settings</DialogTitle>
                        <DialogClose>
                            <Icons.CrossL className="h-4 w-4" />
                        </DialogClose>
                    </div>

                    {/* Main content */}
                    <div className="flex gap-8 pt-6">
                        {/* Left navigation */}
                        <div className="w-48 space-y-2">
                            <Button
                                variant="ghost"
                                className={cn(
                                    'w-full justify-start',
                                    activeTab === 'domain'
                                        ? 'text-foreground-active'
                                        : 'text-muted-foreground',
                                )}
                                onClick={() => setActiveTab('domain')}
                            >
                                <Icons.Globe className="mr-2 h-4 w-4" />
                                Domain
                            </Button>
                            <Button
                                variant="ghost"
                                className={cn(
                                    'w-full justify-start',
                                    activeTab === 'project'
                                        ? 'text-foreground-active'
                                        : 'text-muted-foreground',
                                )}
                                onClick={() => setActiveTab('project')}
                            >
                                <Icons.Gear className="mr-2 h-4 w-4" />
                                Project
                            </Button>
                            <Button
                                variant="ghost"
                                className={cn(
                                    'w-full justify-start',
                                    activeTab === 'editor'
                                        ? 'text-foreground-active'
                                        : 'text-muted-foreground',
                                )}
                                onClick={() => setActiveTab('editor')}
                            >
                                <Icons.Pencil className="mr-2 h-4 w-4" />
                                Editor
                            </Button>
                        </div>

                        {/* Right content */}
                        <div className="flex-1 space-y-6">
                            <div className="space-y-4">
                                <h2 className="text-lg font-medium">Base Domain</h2>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">URL</p>
                                    <Input
                                        value="cookies-and-creme.onlook.live"
                                        disabled
                                        className="bg-muted"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Last updated 3 mins ago
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-medium">Custom Domain</h2>
                                    <div className="flex h-5 items-center space-x-2">
                                        <Icons.Sparkles className="h-4 w-4" />
                                        <span className="text-xs">Pro</span>
                                    </div>
                                </div>

                                {!isPro ? (
                                    <div
                                        className={cn(
                                            'rounded-md p-4',
                                            'bg-[#172554] border border-[#2563eb]', // blue-950 and blue-600
                                            'text-[#dbeafe]', // blue-100
                                        )}
                                    >
                                        <p className="text-sm flex items-center gap-2">
                                            You must be on Onlook Pro to use a custom Domain.
                                            <Button
                                                variant="link"
                                                className={cn(
                                                    'px-2 h-auto p-0',
                                                    'text-[#dbeafe] hover:text-[#bfdbfe]', // blue-100 to blue-200
                                                    'font-medium',
                                                )}
                                            >
                                                Upgrade today!
                                            </Button>
                                        </p>
                                    </div>
                                ) : !isVerified ? (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <p className="text-sm text-muted-foreground">
                                                Custom URL
                                            </p>
                                            <Input
                                                placeholder="Input your domain"
                                                className="bg-background"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-sm text-muted-foreground">
                                                Configure
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Your DNS records must be set up with these values.
                                            </p>
                                            <div className="grid grid-cols-3 gap-4 rounded-lg border p-4">
                                                <div className="text-sm font-medium">Name</div>
                                                <div className="text-sm font-medium">Type</div>
                                                <div className="text-sm font-medium">Value</div>

                                                <div className="text-sm">@</div>
                                                <div className="text-sm">A</div>
                                                <div className="text-sm">32.233.32.3</div>

                                                <div className="text-sm">@</div>
                                                <div className="text-sm">A</div>
                                                <div className="text-sm">32.243.32.3</div>

                                                <div className="text-sm">www</div>
                                                <div className="text-sm">CNAME</div>
                                                <div className="text-sm">onlook.live</div>
                                            </div>
                                        </div>
                                        <Button className="w-full">Verify Setup</Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-2">
                                                <p className="text-sm text-muted-foreground">
                                                    Custom URL
                                                </p>
                                                <Input
                                                    value="cookieshop.com"
                                                    disabled
                                                    className="bg-muted"
                                                />
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Icons.CheckCircled className="h-4 w-4 text-green-500" />
                                                <span className="text-xs text-muted-foreground">
                                                    Verified
                                                </span>
                                                <Button variant="ghost" size="icon">
                                                    <Icons.DotsVertical className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-sm text-muted-foreground">
                                                Configure
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Your DNS records must be set up with these values.
                                            </p>
                                            <div className="grid grid-cols-3 gap-4 rounded-lg border p-4">
                                                <div className="text-sm font-medium">Name</div>
                                                <div className="text-sm font-medium">Type</div>
                                                <div className="text-sm font-medium">Value</div>

                                                <div className="text-sm">@</div>
                                                <div className="text-sm">A</div>
                                                <div className="text-sm">32.233.32.3</div>

                                                <div className="text-sm">@</div>
                                                <div className="text-sm">A</div>
                                                <div className="text-sm">32.243.32.3</div>

                                                <div className="text-sm">www</div>
                                                <div className="text-sm">CNAME</div>
                                                <div className="text-sm">onlook.live</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
