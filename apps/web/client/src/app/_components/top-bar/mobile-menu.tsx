'use client';

import { useEffect } from 'react';
import * as Portal from '@radix-ui/react-portal';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@onlook/ui/accordion';
import { cn } from '@onlook/ui/utils';

import { ExternalRoutes } from '@/utils/constants';
import { NAVIGATION_CATEGORIES } from '@/utils/constants/navigation';

interface MobileMenuProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MobileMenu({ isOpen, onOpenChange }: MobileMenuProps) {
    // Handle body scroll lock with class instead of direct style manipulation
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add('overflow-hidden');
        } else {
            document.body.classList.remove('overflow-hidden');
        }

        return () => {
            document.body.classList.remove('overflow-hidden');
        };
    }, [isOpen]);

    return (
        <>
            {/* Hamburger button */}
            <button
                onClick={() => onOpenChange(!isOpen)}
                className="text-foreground-secondary flex items-center justify-center p-3 hover:opacity-80 md:hidden"
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                    />
                </svg>
            </button>

            {/* Backdrop - portaled to body */}
            <Portal.Root>
                <div
                    className={cn(
                        'fixed inset-0 bg-black/40 backdrop-blur-sm transition-all duration-200 md:hidden',
                        'top-12', // Start below the navbar
                        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
                    )}
                    onClick={() => onOpenChange(false)}
                    style={{ zIndex: 40 }}
                />
            </Portal.Root>

            {/* Menu panel - portaled to body */}
            <Portal.Root>
                <div
                    className={cn(
                        'bg-background border-border fixed right-0 left-0 overflow-y-auto border-b shadow-lg transition-all duration-200 md:hidden',
                        'top-12 max-h-[calc(100vh-3rem)]',
                        isOpen
                            ? 'translate-y-0 opacity-100'
                            : 'pointer-events-none -translate-y-4 opacity-0',
                    )}
                    style={{ zIndex: 50 }}
                >
                    <Accordion type="single" collapsible className="w-full">
                        {NAVIGATION_CATEGORIES.map((category) => (
                            <AccordionItem
                                key={category.label}
                                value={category.label}
                                className="border-border border-b"
                            >
                                <AccordionTrigger className="hover:bg-foreground/5 flex w-full items-center justify-between p-4 text-left">
                                    <span className="text-regular text-foreground-primary">
                                        {category.label}
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent className="bg-foreground/5">
                                    {category.links.map((link) => (
                                        <a
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => onOpenChange(false)}
                                            className="hover:bg-foreground/10 block p-4 pl-8"
                                            {...(link.external && {
                                                target: '_blank',
                                                rel: 'noopener noreferrer',
                                            })}
                                        >
                                            <div className="text-foreground-primary text-sm font-medium">
                                                {link.title}
                                            </div>
                                            <div className="text-foreground-secondary mt-0.5 text-xs">
                                                {link.description}
                                            </div>
                                        </a>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    {/* Bottom CTA */}
                    <div className="p-4">
                        <a
                            href={ExternalRoutes.BOOK_DEMO}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => onOpenChange(false)}
                            className="bg-foreground-primary text-background block w-full rounded-lg px-4 py-3 text-center text-sm font-medium transition-opacity hover:opacity-90"
                        >
                            Book a Demo
                        </a>
                    </div>
                </div>
            </Portal.Root>
        </>
    );
}
