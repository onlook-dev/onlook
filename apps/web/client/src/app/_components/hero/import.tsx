'use client';

import { api } from '@/trpc/react';
import { LocalForageKeys, Routes } from '@/utils/constants';
import { Icons } from '@onlook/ui/icons/index';
import localforage from 'localforage';
import { useRouter } from 'next/navigation';
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
            className="text-sm text-foreground-secondary hover:text-foreground transition-colors duration-200 flex items-center gap-2"
        >
            <Icons.Upload className="w-4 h-4" />
            Import a Next.js App
        </button>
    )
}