'use client';

import Link from 'next/link';

import { Button } from '@onlook/ui/button';

import { CurrentUserAvatar } from '@/components/ui/avatar-dropdown';
import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';

export const AuthButton = () => {
    const { data: user } = api.user.get.useQuery();
    return (
        <div className="mt-0 flex items-center gap-3">
            {user ? (
                <>
                    <Button variant="secondary" asChild className="cursor-pointer rounded">
                        <Link href={Routes.PROJECTS}>Projects</Link>
                    </Button>
                    <CurrentUserAvatar className="cursor-pointer hover:opacity-80" />
                </>
            ) : (
                <Button variant="secondary" asChild className="cursor-pointer rounded">
                    <Link href={Routes.LOGIN}>Sign In</Link>
                </Button>
            )}
        </div>
    );
};
