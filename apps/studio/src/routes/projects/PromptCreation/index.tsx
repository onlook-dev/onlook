import backgroundImageDark from '@/assets/dunes-create-dark.png';
import backgroundImageLight from '@/assets/dunes-create-light.png';
import { useAuthManager, useProjectsManager } from '@/components/Context';
import { useTheme } from '@/components/ThemeProvider';
import { ProjectTabs } from '@/lib/projects';
import { CreateState } from '@/lib/projects/create';
import { Theme } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { CreateErrorCard } from './CreateError';
import { CreateLoadingCard } from './CreateLoading';
import { PromptingCard } from './PromptingCard';

export const PromptCreation = observer(({ initialScreen = false }: { initialScreen?: boolean }) => {
    const { t } = useTranslation();
    const authManager = useAuthManager();
    const projectsManager = useProjectsManager();
    const { theme } = useTheme();
    const [backgroundImage, setBackgroundImage] = useState(backgroundImageLight);

    useEffect(() => {
        const handleEscapeKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                returnToProjects();
            }
        };

        window.addEventListener('keydown', handleEscapeKey);
        return () => window.removeEventListener('keydown', handleEscapeKey);
    }, []);

    const returnToProjects = () => {
        if (projectsManager.create.state === CreateState.CREATE_LOADING) {
            console.warn('Cannot return to projects while loading');
            return;
        }
        projectsManager.projectsTab = ProjectTabs.PROJECTS;
    };

    useEffect(() => {
        const determineBackgroundImage = () => {
            if (theme === Theme.Dark) {
                return backgroundImageDark;
            } else if (theme === Theme.Light) {
                return backgroundImageLight;
            } else if (theme === Theme.System) {
                return window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? backgroundImageDark
                    : backgroundImageLight;
            }
            return backgroundImageLight;
        };

        setBackgroundImage(determineBackgroundImage());
    }, [theme]);

    const renderCard = () => {
        switch (projectsManager.create.state) {
            case CreateState.PROMPT:
                return <PromptingCard />;
            case CreateState.CREATE_LOADING:
                return <CreateLoadingCard />;
            case CreateState.ERROR:
                return <CreateErrorCard />;
        }
    };

    return (
        <div className="fixed inset-0">
            <div
                className="relative w-full h-full flex items-center justify-center"
                style={{
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="absolute inset-0 bg-background/50" />
                <div className="relative z-10">
                    <div className="h-fit w-fit flex group fixed top-10 right-10">
                        {initialScreen ? (
                            <div className="flex flex-row gap-2">
                                <Button
                                    variant="outline"
                                    className={cn('bg-transparent')}
                                    onClick={() =>
                                        (projectsManager.projectsTab = ProjectTabs.IMPORT_PROJECT)
                                    }
                                >
                                    <p className="text-microPlus">{t('projects.actions.import')}</p>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className={cn('bg-transparent')}
                                        >
                                            <Icons.Gear className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() =>
                                                window.open('https://onlook.com/', '_blank')
                                            }
                                        >
                                            {t('projects.actions.about')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => authManager.signOut()}>
                                            {t('projects.actions.signOut')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ) : (
                            <Button
                                variant="secondary"
                                className={cn(
                                    'w-fit h-fit flex flex-col gap-1 text-foreground-secondary hover:text-foreground-active backdrop-blur-md bg-background/30',
                                    projectsManager.create.state !== CreateState.PROMPT && 'hidden',
                                )}
                                onClick={returnToProjects}
                            >
                                <Icons.CrossL className="w-4 h-4 cursor-pointer" />
                                <p className="text-microPlus">{t('projects.actions.close')}</p>
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center justify-center p-4">{renderCard()}</div>
                </div>
            </div>
        </div>
    );
});

export default PromptCreation;
