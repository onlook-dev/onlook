import { CurrentUserAvatar } from '@/components/ui/avatar-dropdown';
import { transKeys } from '@/i18n/keys';
import { Routes } from '@/utils/constants';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@onlook/ui/input';

interface TopBarProps {
    searchQuery?: string;
    onSearchChange?: (q: string) => void;
}

export const TopBar = ({ searchQuery, onSearchChange }: TopBarProps) => {
    const t = useTranslations();
    const router = useRouter();
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [recentColors, setRecentColors] = useState<string[]>([]);
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

    // Load suggestions from localStorage
    useEffect(() => {
        try {
            const rs = JSON.parse(localStorage.getItem('onlook_recent_searches') || '[]');
            if (Array.isArray(rs)) setRecentSearches(rs.slice(0, 6));
        } catch {}
        try {
            const rc = JSON.parse(
                localStorage.getItem('onlook_recent_colors') ||
                    localStorage.getItem('usedColors') ||
                    '[]',
            );
            if (Array.isArray(rc)) setRecentColors(rc.slice(0, 10));
        } catch {}
    }, []);

    // Persist non-empty search queries to recent
    useEffect(() => {
        const q = (searchQuery ?? '').trim();
        if (!q) return;
        const timer = setTimeout(() => {
            try {
                const rs = new Set<string>([
                    q,
                    ...((JSON.parse(
                        localStorage.getItem('onlook_recent_searches') || '[]',
                    ) as string[]) || []),
                ]);
                const arr = Array.from(rs).slice(0, 8);
                localStorage.setItem('onlook_recent_searches', JSON.stringify(arr));
                setRecentSearches(arr);
            } catch {}
        }, 600);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    return (
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between p-4 h-12 text-small text-foreground-secondary select-none gap-6">
            <Link href={Routes.HOME} className="flex items-center justify-start mt-0 py-3">
                <Icons.OnlookTextLogo className="w-24" viewBox="0 0 139 17" />
            </Link>

            {typeof onSearchChange === 'function' ? (
                <div className="flex-1 flex justify-center">
                    <motion.div
                        ref={searchContainerRef}
                        className="relative"
                        initial={false}
                        animate={isSearchFocused ? { width: 360 } : { width: 260 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                        <Icons.MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary z-10" />
                        <Input
                            ref={searchInputRef}
                            value={searchQuery ?? ''}
                            onChange={(e) => onSearchChange?.(e.currentTarget.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            placeholder="Search projects"
                            className="pl-9 pr-7"
                        />
                        {(isSearchFocused || (searchQuery ?? '').length > 0) && (
                            <div className="absolute left-0 right-0 top-full mt-2 rounded-md border bg-background shadow-lg p-2 z-50">
                                {recentSearches.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-2 pb-1 text-foreground-tertiary text-xs">Recent searches</div>
                                        <div className="flex flex-wrap gap-2 px-2">
                                            {recentSearches.map((q) => (
                                                <button
                                                    key={q}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => onSearchChange?.(q)}
                                                    className="rounded bg-secondary px-2 py-1 text-xs text-foreground hover:bg-secondary/80"
                                                >
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {recentColors.length > 0 && (
                                    <div>
                                        <div className="px-2 pb-1 text-foreground-tertiary text-xs">Recently used colors</div>
                                        <div className="flex flex-wrap gap-1 px-2">
                                            {recentColors.map((c, i) => (
                                                <button
                                                    key={`${c}-${i}`}
                                                    title={c}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    className="w-5 h-5 rounded border"
                                                    style={{ background: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {recentSearches.length === 0 && recentColors.length === 0 && (
                                    <div className="px-2 py-1 text-xs text-foreground-tertiary">Start typing to search projects…</div>
                                )}
                            </div>
                        )}
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
                            className="text-sm focus:outline-none cursor-pointer"
                            variant="default"
                        >
                            Create
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
                            onSelect={() => {
                                router.push(Routes.HOME);
                            }}
                        >
                            <Icons.Plus className="w-4 h-4 mr-1 text-foreground-secondary group-hover:text-blue-100" />
                            {t(transKeys.projects.actions.newProject)}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className={cn(
                                'focus:bg-teal-100 focus:text-teal-900',
                                'hover:bg-teal-100 hover:text-teal-900',
                                'dark:focus:bg-teal-900 dark:focus:text-teal-100',
                                'dark:hover:bg-teal-900 dark:hover:text-teal-100',
                                'cursor-pointer select-none group',
                            )}
                            onSelect={() => {
                                router.push(Routes.IMPORT_PROJECT);
                            }}
                        >
                            <Icons.Upload className="w-4 h-4 mr-1 text-foreground-secondary group-hover:text-teal-100" />
                            <p className="text-microPlus">{t(transKeys.projects.actions.import)}</p>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <CurrentUserAvatar className="w-8 h-8" />
            </div>
        </div>
    );
};
