// import { useEditorEngine, useProjectsManager, useRouteManager } from '@/components/Context';
// import { ProjectTabs } from '@/lib/projects';
// import { Route } from '@/lib/routes';
import { Button } from '@onlook/ui-v4/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@onlook/ui-v4/dropdown-menu';
import { Icons } from '@onlook/ui-v4/icons';
import { cn } from '@onlook/ui-v4/utils';
import { useTranslations } from 'next-intl';
import { redirect } from 'next/navigation';
import { useRef, useState } from 'react';

export const ProjectBreadcrumb = () => {
    // const editorEngine = useEditorEngine();
    // const projectsManager = useProjectsManager();
    // const routeManager = useRouteManager();
    const t = useTranslations();
    const project = {
        name: 'My Project',
        folderPath: '/Users/johndoe/Projects/my-project',
        previewImg: 'https://via.placeholder.com/150',
        updatedAt: '2021-01-01',
    };
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const closeTimeoutRef = useRef<Timer | null>(null);
    const [isClosingProject, setIsClosingProject] = useState(false);

    async function handleNavigateToProjects(route?: 'create' | 'import') {
        try {
            setIsClosingProject(true);
            // await takeScreenshotWithTimeout();
            // await projectsManager.runner?.stop();

            // TODO: Close project
        } catch (error) {
            console.error('Failed to take screenshot:', error);
        }
        setTimeout(() => {
            setIsClosingProject(false);
            redirect('/projects');
        }, 100);
    }

    const takeScreenshotWithTimeout = async () => {
        try {
            const screenshotPromise = saveScreenshot();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Screenshot timeout')), 5000);
            });
            await Promise.race([screenshotPromise, timeoutPromise]);
        } catch (error) {
            console.warn('Screenshot timed out or failed, continuing anyway');
        }
    };

    const handleOpenProjectFolder = () => {
        // const project = projectsManager.project;
        // if (project && project.folderPath) {
        //     invokeMainChannel(MainChannels.OPEN_IN_EXPLORER, project.folderPath);
        // }
    };

    async function saveScreenshot() {
        // const project = projectsManager.project;
        // if (!project) {
        //     console.error('No project selected');
        //     return;
        // }
        // const projectId = project.id;
        // const result = await editorEngine.takeActiveWebviewScreenshot(projectId, {
        //     save: true,
        // });
        // if (!result || !result.name) {
        //     console.error('Failed to take screenshot');
        //     return;
        // }
        // project.previewImg = result.name;
        // project.updatedAt = new Date().toISOString();
        // projectsManager.updateProject(project);
    }

    return (
        <div className="mx-2 flex flex-row items-center text-small gap-2">
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant={'ghost'}
                        className="mx-0 px-0 gap-2 text-foreground-onlook text-small hover:text-foreground-active hover:bg-transparent"
                    >
                        <Icons.OnlookLogo
                            className={cn(
                                'w-6 h-6 hidden md:block',
                                isClosingProject && 'animate-pulse',
                            )}
                        />
                        <span className="mx-0 max-w-[60px] md:max-w-[100px] lg:max-w-[200px] px-0 text-foreground-onlook text-small truncate cursor-pointer">
                            {isClosingProject
                                ? 'Stopping project...'
                                : project.name}
                        </span>
                        <Icons.ChevronDown className="transition-all rotate-0 group-data-[state=open]:-rotate-180 duration-200 ease-in-out text-foreground-onlook " />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className="w-48"
                    onMouseEnter={() => {
                        if (closeTimeoutRef.current) {
                            clearTimeout(closeTimeoutRef.current);
                        }
                    }}
                    onMouseLeave={() => {
                        closeTimeoutRef.current = setTimeout(() => {
                            setIsDropdownOpen(false);
                        }, 300);
                    }}
                >
                    <DropdownMenuItem onClick={() => handleNavigateToProjects()}>
                        <div className="flex row center items-center group">
                            <Icons.Tokens className="mr-2 group-hover:rotate-12 transition-transform" />
                            {t('projects.actions.goToAllProjects')}
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            {t('projects.actions.newProject')}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem
                                onClick={() => handleNavigateToProjects('create')}
                                className={cn(
                                    'focus:bg-blue-100 focus:text-blue-900',
                                    'hover:bg-blue-100 hover:text-blue-900',
                                    'dark:focus:bg-blue-900 dark:focus:text-blue-100',
                                    'dark:hover:bg-blue-900 dark:hover:text-blue-100',
                                )}
                            >
                                <Icons.FilePlus className="mr-2 h-4 w-4" />
                                {t('projects.actions.startFromScratch')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleNavigateToProjects('import')}
                                className={cn(
                                    'focus:bg-teal-100 focus:text-teal-900',
                                    'hover:bg-teal-100 hover:text-teal-900',
                                    'dark:focus:bg-teal-900 dark:focus:text-teal-100',
                                    'dark:hover:bg-teal-900 dark:hover:text-teal-100',
                                )}
                            >
                                <Icons.Download className="mr-2 h-4 w-4" />
                                {t('projects.actions.importProject')}
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleOpenProjectFolder}>
                        {t('projects.actions.showInExplorer')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => {
                            // editorEngine.isPlansOpen = true;
                        }}
                    >
                        {t('projects.actions.subscriptions')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => {
                            // editorEngine.isSettingsOpen = true;
                            // editorEngine.settingsTab = SettingsTabValue.PROJECT;
                        }}
                    >
                        {t('projects.actions.settings')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
