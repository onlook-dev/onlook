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
        <div className="flex flex-row h-12 px-12 items-center">
            <Link href={Routes.HOME} className="flex-1 flex items-center justify-start mt-3">
                <Icons.OnlookTextLogo className="w-24" viewBox="0 0 139 17" />
            </Link>
            <div className="flex-1 flex justify-end space-x-2 mt-4 items-center">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            className="text-sm text-foreground-onlook focus:outline-none"
                            variant="ghost"
                        >
                            <Icons.Plus className="w-5 h-5 mr-2" />
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
                            )}
                            onSelect={() => {
                                router.push(Routes.HOME);
                            }}
                        >
                            <Icons.Plus className="w-4 h-4 mr-2" />
                            {t(transKeys.projects.actions.newProject)}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className={cn(
                                'focus:bg-teal-100 focus:text-teal-900',
                                'hover:bg-teal-100 hover:text-teal-900',
                                'dark:focus:bg-teal-900 dark:focus:text-teal-100',
                                'dark:hover:bg-teal-900 dark:hover:text-teal-100',
                            )}
                            onSelect={() => {
                                router.push(Routes.IMPORT_PROJECT);
                            }}
                        >
                            <Icons.Download className="w-4 h-4 mr-2" />
                            <p className="text-microPlus">{t('projects.actions.import')}</p>

                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <CurrentUserAvatar className="w-8 h-8" />
            </div>
        </div>
    );
};
