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

export const TopBar = () => {
    const t = useTranslations();
    const router = useRouter();

    return (
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between p-4 h-12 text-small text-foreground-secondary select-none">
            <Link href={Routes.HOME} className="flex-1 flex items-center justify-start mt-0 py-3">
                <Icons.OnlookTextLogo className="w-24" viewBox="0 0 139 17" />
            </Link>
            <div className="flex-1 flex justify-end space-x-2 mt-0 items-center">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            className="text-sm text-foreground-onlook focus:outline-none cursor-pointer"
                            variant="ghost"
                        >
                            <Icons.Plus className="w-5 h-5 mr-1" />
                            New Project
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
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
