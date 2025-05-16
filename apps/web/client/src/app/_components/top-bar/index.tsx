'use client';

import { useUserManager } from '@/components/store/user';
import { CurrentUserAvatar } from '@/components/ui/avatar-dropdown';
import { Routes } from '@/utils/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { GitHubButton } from './github';

export const TopBar = observer(() => {
    const userManager = useUserManager();
    const user = userManager.user;

    return (
        <div className="w-full flex items-center justify-between p-4 text-sm text-secondary-foreground font-thin">
            <div className="flex items-center gap-8">
                <Link href={Routes.HOME}>
                    <Icons.OnlookTextLogo className="h-3" />
                </Link>
                <Link href="/about" className="text-sm hover:opacity-80">
                    About
                </Link>
                <GitHubButton />
                <Link href="https://docs.onlook.dev" target="_blank" className="text-sm hover:opacity-80">
                    Docs
                </Link>
            </div>
            <div className="flex items-center gap-3">
                {user ? (
                    <>
                        <Button variant="secondary" asChild className="rounded">
                            <Link href={Routes.PROJECTS}>Projects</Link>
                        </Button>
                        <CurrentUserAvatar />
                    </>
                ) : (
                    <Button variant="secondary" asChild className="rounded">
                        <Link href={Routes.LOGIN}>Sign In</Link>
                    </Button>
                )}
            </div>
        </div>
    );
});
