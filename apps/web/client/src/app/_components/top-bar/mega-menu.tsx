'use client';

import { type NavigationLink } from '@/utils/constants/navigation';
import { cn } from '@onlook/ui/utils';
import { useEffect, useRef, useState } from 'react';
import { Icons } from '@onlook/ui/icons';

interface DropdownMenuProps {
    label: string;
    links: NavigationLink[];
}

export function DropdownMenu({ label, links }: DropdownMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div
            ref={menuRef}
            className="relative"
            onMouseEnter={() => {
                // Only auto-open on hover for desktop
                if (window.innerWidth >= 768) {
                    setIsOpen(true);
                }
            }}
            onMouseLeave={() => {
                // Only auto-close on mouse leave for desktop
                if (window.innerWidth >= 768) {
                    setIsOpen(false);
                }
            }}
        >
            <button
                onClick={handleToggle}
                className="text-sm text-foreground-secondary hover:opacity-80 flex items-center gap-1 py-2 px-1 -mx-1 active:opacity-60"
            >
                {label}
                <Icons.ChevronDown
                    className={cn(
                        'w-4 h-4 transition-transform',
                        isOpen && 'rotate-180',
                    )}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
                    <div className="bg-background-primary border border-foreground-primary/10 rounded-lg shadow-lg p-1 min-w-[200px]">
                        <ul className="space-y-1">
                            {links.map((link) => (
                                <li key={link.href}>
                                    <a
                                        href={link.href}
                                        target={link.external ? '_blank' : undefined}
                                        rel={link.external ? 'noopener noreferrer' : undefined}
                                        className="block py-2 px-2 rounded-md hover:bg-foreground-primary/5 active:bg-foreground-primary/10 transition-colors"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <div className="text-regular text-foreground-primary">
                                            {link.title}
                                        </div>
                                        <div className="text-small text-foreground-tertiary">
                                            {link.description}
                                        </div>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

