'use client';

import { useUserManager } from '@/components/store/user';
import { CurrentUserAvatar } from '@/components/ui/avatar-dropdown';
import { Routes } from '@/utils/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';
import Link from 'next/link';

export const TopBar = observer(() => {
    const userManager = useUserManager();
    const user = userManager.user;

    return (
        <div className="w-full flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
                <Link href={Routes.HOME}>
                    <Icons.OnlookTextLogo className="h-3" />
                </Link>
                <Link href={Routes.PROJECTS}>GitHub</Link>
                <Link href={Routes.PROJECTS}>Docs</Link>
            </div>
            <div className="flex items-center gap-2">
                {user ? (
                    <>
                        <Button variant="outline" asChild>
                            <Link href={Routes.PROJECTS}>Projects</Link>
                        </Button>
                        <CurrentUserAvatar />
                    </>
                ) : (
                    <Button variant="outline" asChild>
                        <Link href={Routes.LOGIN}>Sign In</Link>
                    </Button>
                )}
            </div>
        </div>
    );
});
