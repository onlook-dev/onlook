'use client';

import { useStateManager } from '@/components/store/state';
import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/client';
import { openFeedbackWidget, resetTelemetry } from '@/utils/telemetry';
import { getReturnUrlQueryParam } from '@/utils/url';
import { Avatar, AvatarFallback, AvatarImage } from '@onlook/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { getInitials } from '@onlook/utility';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { UsageSection } from './plans';
import { SettingsTabValue } from '../settings-modal/helpers';

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
        // Clear analytics/feedback identities before signing out
        void resetTelemetry();
        await supabase.auth.signOut();
        const returnUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
        router.push(`${Routes.LOGIN}?${getReturnUrlQueryParam(returnUrl)}`);
    };

    const handleOpenSubscription = () => {
        stateManager.settingsTab = SettingsTabValue.SUBSCRIPTION;
        stateManager.isSettingsModalOpen = true;
        setOpen(false);
    };

    const handleOpenSettings = () => {
        stateManager.settingsTab = SettingsTabValue.PREFERENCES;
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
                void openFeedbackWidget();
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
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button>
                    <Avatar className={className}>
                        {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={initials} />}
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 p-0">
                <div className="flex items-center gap-2 p-3 select-none">
                    <div className="flex flex-col">
                        <span className="text-smallPlus">{user?.firstName ?? user?.displayName}</span>
                        <span className="text-mini text-foreground-secondary">{user?.email}</span>
                    </div>
                </div>
                <DropdownMenuSeparator />
                <UsageSection open={open} />
                <DropdownMenuSeparator />
                <div className="p-2">
                    {BUTTONS.map((button) => {
                        const IconComponent = button.icon;
                        return (
                            <DropdownMenuItem
                                key={button.label}
                                className="cursor-pointer"
                                onClick={button.onClick}
                            >
                                <div className="flex flex-row center items-center group">
                                    <IconComponent className="mr-2" />
                                    {button.label}
                                </div>
                            </DropdownMenuItem>
                        );
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
