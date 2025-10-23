'use client';

import { ExternalRoutes } from '@/utils/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';

export function BookDemo() {
    return (
        <Button
            asChild
            className="bg-foreground-primary text-background-primary hover:bg-foreground-hover"
        >
            <a href={ExternalRoutes.BOOK_DEMO} target="_blank" rel="noopener noreferrer">
                Book a Demo
                <Icons.ArrowRight className="h-4 w-4" />
            </a>
        </Button>
    );
}
