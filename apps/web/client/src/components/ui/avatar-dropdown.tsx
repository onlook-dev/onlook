'use client';

import { useUserManager } from '@/components/store/user';
import { Avatar, AvatarFallback, AvatarImage } from '@onlook/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons/index';
import { redirect, usePathname } from 'next/navigation';

export const CurrentUserAvatar = ({ className }: { className?: string }) => {
    const currentPath = usePathname();
    const userManager = useUserManager();
    const user = userManager.user;
    const initials = user?.name
        ?.split(' ')
        ?.map((word) => word[0])
        ?.join('')
        ?.toUpperCase();

    const handleSignOut = async () => {
        await userManager.signOut();
        redirect(currentPath);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className={className}>
                    {user?.image && <AvatarImage src={user.image} alt={initials} />}
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
