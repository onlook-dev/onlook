'use client';

import { ExternalRoutes, Routes } from '@/utils/constants';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { usePathname } from 'next/navigation';
import { GitHubButton } from './github';
import { AuthButton } from './user';

const LINKS = [
    {
        href: Routes.HOME,
        child: <Icons.OnlookTextLogo className="h-3" />,
    },
    {
        href: Routes.PRICING,
        child: 'Pricing',
        hidden: true,
    },
    {
        href: Routes.FAQ,
        child: 'FAQ',
        hidden: true,
    },
    {
        href: Routes.ABOUT,
        child: 'About',
        hidden: true,
    },
];

export const TopBar = () => {
    const currentPath = usePathname();
    return (
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between p-4 h-12 text-small text-foreground-secondary select-none">
            <div className="flex items-center gap-8 mt-0 text-regular text-foreground-secondary">
                {LINKS.map((link) => (
                    <a href={link.href} key={link.href} className={cn(
                        'hover:opacity-80',
                        currentPath === link.href && 'text-foreground-primary',
                        link.hidden && 'hidden',
                        link.href === Routes.HOME && 'py-4 pr-2',
                    )}>
                        {link.child}
                    </a>
                ))}
                <a href={ExternalRoutes.DOCS} target="_blank" className="text-regular hover:underline">
                    Docs
                </a>
                <GitHubButton />
            </div>
            <AuthButton />
        </div>
    );
};
