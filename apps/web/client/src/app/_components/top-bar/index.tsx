'use client';

import { Routes } from '@/utils/constants';
import { NAVIGATION_CATEGORIES } from '@/utils/constants/navigation';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { GitHubButton } from './github';
import { DropdownMenu } from './mega-menu';
import { MobileMenu } from './mobile-menu';
import { AuthButton } from './user';

const LINKS = [
    {
        href: Routes.HOME,
        child: <Icons.OnlookTextLogo className="h-3" />,
    },
];

export const TopBar = () => {
    const currentPath = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="relative w-full max-w-6xl mx-auto flex items-center justify-between p-3 h-12 text-sm text-foreground-secondary select-none">
            {/* Left side - Logo and GitHub stars grouped together */}
            <div className="flex items-center gap-4 text-foreground-secondary">
                {LINKS.map((link) => (
                    <a href={link.href} key={link.href} className={cn(
                        'hover:opacity-80',
                        currentPath === link.href && 'text-foreground-primary',
                        link.href === Routes.HOME && 'py-4 pr-2',
                    )}>
                        {link.child}
                    </a>
                ))}
                
                {/* GitHub stars visible on mobile, grouped with logo */}
                <div className="md:hidden">
                    <GitHubButton />
                </div>

                {/* Desktop dropdowns - hidden on mobile */}
                <div className="hidden md:flex items-center gap-5 ml-3">
                    {NAVIGATION_CATEGORIES.map((category) => (
                        <DropdownMenu key={category.label} label={category.label} links={category.links} />
                    ))}
                    <GitHubButton />
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
                {/* Auth button - hidden on mobile */}
                <div className="hidden md:block">
                    <AuthButton />
                </div>

                {/* Mobile menu */}
                <MobileMenu
                    isOpen={isMobileMenuOpen}
                    onOpenChange={setIsMobileMenuOpen}
                />
            </div>
        </div>
    );
};
