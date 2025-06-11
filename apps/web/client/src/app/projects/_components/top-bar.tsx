import { useProjectsManager } from '@/components/store/projects';
import { ProjectTabs } from '@/components/store/projects/manager';
import { CurrentUserAvatar } from '@/components/ui/avatar-dropdown';
import { transKeys } from '@/i18n/keys';
import { Routes } from '@/utils/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export const TopBar = () => {
    const t = useTranslations();
    const router = useRouter();
    const projectsManager = useProjectsManager();
    return (
        <div className="flex flex-row h-12 px-12 items-center">
            <Link href={Routes.HOME} className="flex-1 flex items-center justify-start mt-3">
                <Icons.OnlookTextLogo className="w-24" viewBox="0 0 139 17" />
            </Link>
            <div className="flex-1 flex justify-end space-x-2 mt-4 items-center">
                <Button
                    className="text-sm text-foreground-onlook focus:outline-none hover:bg-background-onlook cursor-pointer"
                    variant="ghost"
                    onClick={() => {
                        router.push(Routes.HOME);
                    }}
                >
                    <Icons.Plus className="w-5 h-5 mr-2" />
                    {t(transKeys.projects.actions.newProject)}
                </Button>
                <Button
                    variant="outline"
                    className={cn('bg-transparent')}
                    onClick={() => (projectsManager.projectsTab = ProjectTabs.IMPORT_PROJECT)}
                >
                    <p className="text-microPlus">{t('projects.actions.import')}</p>
                </Button>
                <CurrentUserAvatar className="w-8 h-8" />
            </div>
        </div>
    );
};
