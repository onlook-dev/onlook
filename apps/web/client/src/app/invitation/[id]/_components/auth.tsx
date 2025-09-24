'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';

import { Routes } from '@/utils/constants';
import { getReturnUrlQueryParam } from '@/utils/url';

export const HandleAuth = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleLogin = () => {
        const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
        router.push(`${Routes.LOGIN}?${getReturnUrlQueryParam(currentUrl)}`);
    };

    return (
        <div className="flex h-screen items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-4">
                <div className="text-2xl">You must be logged in to accept this invitation</div>
                <Button variant="outline" onClick={handleLogin}>
                    <Icons.OnlookLogo className="size-4" />
                    Login or Signup
                </Button>
            </div>
        </div>
    );
};
