'use client';

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
import { Progress } from '@onlook/ui/progress';
import { Separator } from '@onlook/ui/separator';
import { redirect } from 'next/navigation';
import { useState } from 'react';

export const CurrentUserAvatar = ({ className, disableDropdown = false }: { className?: string, disableDropdown?: boolean }) => {
    const userManager = useUserManager();
    const [open, setOpen] = useState(false);

    const user = userManager.user;
    const initials = user?.name
        ?.split(' ')
        ?.map((word) => word[0])
        ?.join('')
        ?.toUpperCase();

    const handleSignOut = async () => {
        await userManager.signOut();
        redirect(Routes.LOGIN);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild disabled={disableDropdown} >
                <button>
                    <Avatar className={className}>
                        {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={initials} />}
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0">
                <div className="flex items-center gap-2 p-4">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{user?.name}</span>
                        <span className="text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                </div>
                <Separator />
                <PlanSection />
                <Separator />
                <div className="p-2">
                    <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="flex w-full justify-start items-start rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                        <Icons.CornerRadius className="mr-2 h-4 w-4" /> Subscription
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="flex w-full justify-start items-start rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                        <Icons.Gear className="mr-2 h-4 w-4" /> Settings
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="flex w-full justify-start items-start rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                        <Icons.QuestionMarkCircled className="mr-2 h-4 w-4" /> Help Center
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="flex w-full justify-start items-start rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                        <Icons.Exit className="mr-2 h-4 w-4" /> Sign Out
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export const PlanSection = () => {
    // Example values; in a real app, these would be props or come from context/store
    const planName = "Free Plan";
    const planStatus = "Trial";
    const dailyUsed = 4;
    const dailyLimit = 5;
    const usagePercent = (dailyUsed / dailyLimit) * 100;

    return (
        <div className="p-4 w-full text-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div>
                    <div className="text-sm">{planName}</div>
                    <div className="text-muted-foreground">{planStatus}</div>
                </div>
                <div className="text-right">
                    <div>{dailyUsed} <span className="text-muted-foreground">of</span> {dailyLimit}</div>
                    <div className="text-muted-foreground">daily chats used</div>
                </div>
            </div>
            <Progress value={usagePercent} className="w-full" />
            <Button className="w-full flex items-center justify-center gap-2 bg-blue-400 text-white hover:bg-blue-300" onClick={() => { }}>
                <Icons.Sparkles className="mr-1 h-4 w-4" /> Get more Credits
            </Button>
        </div>
    );
};