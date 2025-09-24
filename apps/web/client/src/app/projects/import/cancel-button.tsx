import Link from 'next/link';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

import { Routes } from '@/utils/constants';

export const CancelButton = () => {
    return (
        <Button
            variant="outline"
            asChild
            className="cursor-pointer rounded-lg border-[0.5px] !border-gray-200 px-3 py-2"
        >
            <Link href={Routes.HOME}>
                <Icons.CrossL className="h-4 w-4" /> Cancel
            </Link>
        </Button>
    );
};
