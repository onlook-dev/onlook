'use client';

import { useUserManager } from '@/components/store/user';
import { CurrentUserAvatar } from '@/components/ui/avatar-dropdown';
import { Routes } from '@/utils/constants';
import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';
import Link from 'next/link';

export const AuthButton = observer(() => {
    const userManager = useUserManager();
    const user = userManager.user;

    return (
        <div className="flex items-center gap-3 mt-0">
            {user ? (
                <>
                    <Button variant="secondary" asChild className="rounded cursor-pointer">
                        <Link href={Routes.PROJECTS}>Projects</Link>
                    </Button>
                    <CurrentUserAvatar className="cursor-pointer hover:opacity-80" />
                </>
            ) : (
                <Button variant="secondary" asChild className="rounded cursor-pointer">
                    <Link href={Routes.LOGIN}>Sign In</Link>
                </Button>
            )}
        </div>
    );
});