'use client';

import { ExternalRoutes, Routes } from '@/utils/constants';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { GitHubButton } from './github';
import { DropdownMenu, type MenuLink } from './mega-menu';
import { MobileMenuButton, MobileMenuContent } from './mobile-menu';
import { AuthButton } from './user';

const LINKS = [
    {
        href: Routes.HOME,
        child: <Icons.OnlookTextLogo className="h-3" />,
    },
];

const PRODUCT_LINKS: MenuLink[] = [
    {
        title: 'AI',
        href: Routes.FEATURES_AI,
        description: 'AI-powered design',
    },
    {
        title: 'Visual Builder',
        href: Routes.FEATURES_BUILDER,
        description: 'Craft on a canvas',
    },
    {
        title: 'Prototyping',
        href: Routes.FEATURES_PROTOTYPE,
        description: 'Rapid prototype creation',
    },
    {
        title: 'All Features',
        href: Routes.FEATURES,
        description: 'See everything Onlook offers',
    },
];

const RESOURCES_LINKS: MenuLink[] = [
    {
        title: 'Documentation',
        href: ExternalRoutes.DOCS,
        description: 'Learn how to use Onlook',
        external: true,
    },
    {
        title: 'Blog',
        href: ExternalRoutes.BLOG,
        description: 'News and updates',
        external: true,
    },
    {
        title: 'GitHub',
        href: ExternalRoutes.GITHUB,
        description: 'View the source code',
        external: true,
    },
    {
        title: 'Discord',
        href: ExternalRoutes.DISCORD,
        description: 'Join our community',
        external: true,
    },
];

const ABOUT_LINKS: MenuLink[] = [
    {
        title: 'About Us',
        href: Routes.ABOUT,
        description: 'Learn about our mission',
    },
    {
        title: 'FAQ',
        href: Routes.FAQ,
        description: 'Common questions',
    },
    {
        title: 'Book a Demo',
        href: 'https://meetings.hubspot.com/daniel-onlook/onboarding-to-onlook-with-daniel',
        description: 'Book a demo with our team',
        external: true,
    },
];

export const TopBar = () => {
    const currentPath = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="relative w-full max-w-6xl mx-auto flex items-center justify-between p-3 h-12 text-sm text-foreground-secondary select-none" style={{ zIndex: 9999 }}>
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
                    <DropdownMenu label="Product" links={PRODUCT_LINKS} />
                    <DropdownMenu label="Resources" links={RESOURCES_LINKS} />
                    <DropdownMenu label="About" links={ABOUT_LINKS} />
                    <GitHubButton />
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
                {/* Auth button - hidden on mobile */}
                <div className="hidden md:block">
                    <AuthButton />
                </div>
                
                {/* Mobile hamburger menu - on far right */}
                <div className="md:hidden">
                    <MobileMenuButton onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
                </div>
            </div>

            {/* Mobile menu dropdown */}
            <MobileMenuContent 
                isOpen={isMobileMenuOpen} 
                onClose={() => setIsMobileMenuOpen(false)} 
            />
        </div>
    );
};
