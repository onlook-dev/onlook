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
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between p-4 h-12 text-small text-foreground-secondary select-none">
            <div className="flex items-center gap-10 mt-0">
                <Link href={Routes.HOME}>
                    <Icons.OnlookTextLogo className="h-3" />
                </Link>
                <Link href="https://docs.onlook.com" target="_blank" className="text-regular hover:opacity-80">
                    Docs
                </Link>
                {/* <Link href={Routes.PRICING} className="text-regular hover:opacity-80">
                    Pricing
                </Link> */}
                <GitHubButton />
            </div>
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
        </div>
    );
});
