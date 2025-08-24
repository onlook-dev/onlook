'use client';

import { useStateManager } from '@/components/store/state';
import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/client';
import { getReturnUrlQueryParam } from '@/utils/url';
import { Avatar, AvatarFallback, AvatarImage } from '@onlook/ui/avatar';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@onlook/ui/popover';
import { Separator } from '@onlook/ui/separator';
import { getInitials } from '@onlook/utility';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { UsageSection } from './plans';

export const CurrentUserAvatar = ({ className }: { className?: string }) => {
    const stateManager = useStateManager();
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const { data: user } = api.user.get.useQuery();
    const initials = getInitials(user?.displayName ?? user?.firstName ?? '');
    const [open, setOpen] = useState(false);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        const returnUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
        router.push(`${Routes.LOGIN}?${getReturnUrlQueryParam(returnUrl)}`);
    };

    const handleOpenSubscription = () => {
        stateManager.isSubscriptionModalOpen = true;
        setOpen(false);
    };

    const handleOpenSettings = () => {
        stateManager.isSettingsModalOpen = true;
        setOpen(false);
    };

    const BUTTONS = [
        {
            label: 'Subscription',
            icon: Icons.CreditCard,
            onClick: handleOpenSubscription,
        },
        {
            label: 'Settings',
            icon: Icons.Gear,
            onClick: handleOpenSettings,
        },
        {
            label: 'Send Feedback',
            icon: Icons.MessageSquare,
            onClick: () => {
                stateManager.isFeedbackModalOpen = true;
                setOpen(false);
            },
        },
        {
            label: 'Sign Out',
            icon: Icons.Exit,
            onClick: handleSignOut,
        },
    ];

    return (
        <Popover open={open} onOpenChange={setOpen} >
            <PopoverTrigger asChild>
                <button>
                    <Avatar className={className}>
                        {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={initials} />}
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" >
                <div className="flex items-center gap-2 p-3 select-none">
                    <div className="flex flex-col">
                        <span className="text-smallPlus">{user?.firstName ?? user?.displayName}</span>
                        <span className="text-mini text-foreground-secondary">{user?.email}</span>
                    </div>
                </div>
                <Separator />
                <UsageSection open={open} />
                <Separator />
                <div className="p-2 flex flex-col items-start">
                    {BUTTONS.map((button) => (
                        <Button
                            key={button.label}
                            variant="ghost"
                            className="flex w-full justify-start items-start rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={button.onClick}
                        >
                            <button.icon className="mr-2 h-4 w-4" />
                            <span className="text-sm">{button.label}</span>
                        </Button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
};
