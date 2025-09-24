'use client';

import { useRouter } from 'next/navigation';
import localforage from 'localforage';

import { Icons } from '@onlook/ui/icons/index';

import { api } from '@/trpc/react';
import { LocalForageKeys, Routes } from '@/utils/constants';
import { useAuthContext } from '../../auth/auth-context';

export function Import() {
    const router = useRouter();
    const { data: user } = api.user.get.useQuery();
    const { setIsAuthModalOpen } = useAuthContext();

    const handleImportProject = () => {
        if (!user?.id) {
            // Store the return URL and open auth modal
            localforage.setItem(LocalForageKeys.RETURN_URL, Routes.IMPORT_PROJECT);
            setIsAuthModalOpen(true);
            return;
        }

        // Navigate to import project flow
        router.push(Routes.IMPORT_PROJECT);
    };

    return (
        <button
            onClick={handleImportProject}
            className="text-foreground-secondary hover:text-foreground flex items-center gap-2 text-sm transition-colors duration-200"
        >
            <Icons.Upload className="h-4 w-4" />
            Import a Next.js App
        </button>
    );
}
