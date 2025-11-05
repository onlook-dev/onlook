'use client';

import { transKeys } from '@/i18n/keys';
import type { User } from '@onlook/models';
import { Avatar, AvatarFallback, AvatarImage } from '@onlook/ui/avatar';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { cn } from '@onlook/ui/utils';
import { getInitials } from '@onlook/utility';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface TopBarPresentationProps {
    /** Current user data */
    user?: User | null;
    /** Current search query */
    searchQuery?: string;
    /** Callback when search changes */
    onSearchChange?: (q: string) => void;
    /** Recent search suggestions */
    recentSearches?: string[];
    /** Whether a project is being created */
    isCreatingProject?: boolean;
    /** Callback when creating a blank project */
    onCreateBlank?: () => void;
    /** Callback when importing a project */
    onImport?: () => void;
    /** Home route path */
    homeRoute?: string;
}

/**
 * TopBarPresentation - Pure presentational version of the TopBar component.
 * Receives all data and callbacks as props instead of using hooks/context.
 */
export const TopBarPresentation = ({
    user,
    searchQuery,
    onSearchChange,
    recentSearches = [],
    isCreatingProject = false,
    onCreateBlank,
    onImport,
    homeRoute = '/',
}: TopBarPresentationProps) => {
    const t = useTranslations();
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                searchContainerRef.current &&
                !searchContainerRef.current.contains(event.target as Node)
            ) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsSearchFocused(false);
                searchInputRef.current?.blur();
                onSearchChange?.('');
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onSearchChange]);

    return (
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between p-4 text-small text-foreground-secondary gap-6">
            <Link href={homeRoute} className="flex items-center justify-start mt-0 py-3">
                <Icons.OnlookTextLogo className="w-24" viewBox="0 0 139 17" />
            </Link>

            {typeof onSearchChange === 'function' ? (
                <div className="flex-1 flex justify-center min-w-0">
                    <motion.div
                        ref={searchContainerRef}
                        className="relative w-full hidden sm:block"
                        initial={false}
                        animate={isSearchFocused ?
                            { width: '100%', maxWidth: '360px' } :
                            { width: '100%', maxWidth: '260px' }
                        }
                        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                        <Icons.MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary z-10" />
                        <Input
                            ref={searchInputRef}
                            value={searchQuery ?? ''}
                            onChange={(e) => onSearchChange?.(e.currentTarget.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            placeholder="Search projects"
                            className="pl-9 pr-7 focus-visible:border-transparent focus-visible:ring-0 w-full"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSearchChange?.('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-tertiary hover:text-foreground"
                                aria-label="Clear search"
                            >
                                <Icons.CrossS className="h-4 w-4" />
                            </button>
                        )}
                    </motion.div>
                </div>
            ) : (
                <div className="flex-1" />
            )}

            <div className="flex justify-end gap-3 mt-0 items-center">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            className="text-sm focus:outline-none cursor-pointer py-[0.4rem] h-8"
                            variant="default"
                            disabled={isCreatingProject}
                        >
                            {isCreatingProject ? (
                                <>
                                    Creating... <Icons.LoadingSpinner className="animate-spin" />
                                </>
                            ) : (
                                <>
                                    Create <Icons.ChevronDown />
                                </>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent sideOffset={8} className="translate-x-[-12px]">
                        <DropdownMenuItem
                            className={cn(
                                'focus:bg-blue-100 focus:text-blue-900',
                                'hover:bg-blue-100 hover:text-blue-900',
                                'dark:focus:bg-blue-900 dark:focus:text-blue-100',
                                'dark:hover:bg-blue-900 dark:hover:text-blue-100',
                                'cursor-pointer select-none group',
                            )}
                            onSelect={onCreateBlank}
                            disabled={isCreatingProject}
                        >
                            {isCreatingProject ? (
                                <Icons.LoadingSpinner className="w-4 h-4 mr-1 animate-spin text-foreground-secondary group-hover:text-blue-100" />
                            ) : (
                                <Icons.FilePlus className="w-4 h-4 mr-1 text-foreground-secondary group-hover:text-blue-100" />
                            )}
                            {t(transKeys.projects.actions.blankProject)}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className={cn(
                                'focus:bg-teal-100 focus:text-teal-900',
                                'hover:bg-teal-100 hover:text-teal-900',
                                'dark:focus:bg-teal-900 dark:focus:text-teal-100',
                                'dark:hover:bg-teal-900 dark:hover:text-teal-100',
                                'cursor-pointer select-none group',
                            )}
                            onSelect={onImport}
                        >
                            <Icons.Upload className="w-4 h-4 mr-1 text-foreground-secondary group-hover:text-teal-100" />
                            <p className="text-microPlus">{t(transKeys.projects.actions.import)}</p>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                {/* Simple avatar for presentational component - no dropdown */}
                <Avatar className="w-8 h-8">
                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={getInitials(user?.displayName ?? user?.firstName ?? '')} />}
                    <AvatarFallback>{getInitials(user?.displayName ?? user?.firstName ?? '')}</AvatarFallback>
                </Avatar>
            </div>
        </div>
    );
};
