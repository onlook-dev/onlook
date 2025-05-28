'use client';

import { useUserManager } from '@/components/store/user';
import { Routes } from '@/utils/constants';
import { Avatar, AvatarFallback, AvatarImage } from '@onlook/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons/index';
import { redirect } from 'next/navigation';

export const CurrentUserAvatar = ({ className, disableDropdown = false }: { className?: string, disableDropdown?: boolean }) => {
    const userManager = useUserManager();
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
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disableDropdown}>
                <Avatar className={className}>
                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={initials} />}
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={handleSignOut}>
                    <Icons.Exit className="w-4 h-4 mr-2" /> Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
