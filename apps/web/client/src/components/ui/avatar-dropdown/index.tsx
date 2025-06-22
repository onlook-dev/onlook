'use client';

import { useEditorEngine } from '@/components/store/editor';
import { useUserManager } from '@/components/store/user';
import { Routes } from '@/utils/constants';
import { Avatar, AvatarFallback, AvatarImage } from '@onlook/ui/avatar';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@onlook/ui/popover';
import { Separator } from '@onlook/ui/separator';
import { getInitials } from '@onlook/utility';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export const CurrentUserAvatar = ({ className }: { className?: string }) => {
    const router = useRouter();
    const userManager = useUserManager();
    const editorEngine = useEditorEngine();
    const user = userManager.user;
    const initials = getInitials(user?.name ?? '');
    const [open, setOpen] = useState(false);

    const handleSignOut = async () => {
        await userManager.signOut();
        router.push(Routes.LOGIN);
    };

    const handleOpenSubscription = () => {
        editorEngine.state.plansOpen = true;
        setOpen(false);
    };

    const handleOpenSettings = () => {
        editorEngine.state.settingsOpen = true;
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button>
                    <Avatar className={className}>
                        {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={initials} />}
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0">
                <div className="flex items-center gap-2 p-3 select-none">
                    <div className="flex flex-col">
                        <span className="text-smallPlus">{user?.name}</span>
                        <span className="text-mini text-foreground-secondary">{user?.email}</span>
                    </div>
                </div>
                {/* <Separator />
                <PlanSection /> */}
                <Separator />
                <div className="p-2">
                    {/* <Button
                        variant="ghost"
                        className="flex w-full justify-start items-start rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={handleOpenSubscription}
                    >
                        <Icons.CreditCard className="mr-2 h-4 w-4" /> Subscription
                    </Button> */}
                    <Button
                        variant="ghost"
                        className="flex w-full justify-start items-center rounded-sm px-2 py-2 text-smallPlus text-foreground-secondary hover:bg-accent hover:text-accent-foreground group"
                        onClick={handleOpenSettings}
                    >
                        <Icons.Gear className="mr-1 h-4 w-4 text-foreground-secondary text-sm group-hover:text-foreground-primary" /> Settings
                    </Button>
                    {/* <Button
                        variant="ghost"
                        className="flex w-full justify-start items-start rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                        <Icons.QuestionMarkCircled className="mr-2 h-4 w-4" /> Help Center
                    </Button> */}
                    <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="flex w-full justify-start items-center rounded-sm px-2 py-2 text-smallPlus text-foreground-secondary hover:bg-accent hover:text-accent-foreground group"
                    >
                        <Icons.Exit className="mr-1 h-4 w-4 text-foreground-secondary text-sm group-hover:text-foreground-primary" /> Sign Out
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};
