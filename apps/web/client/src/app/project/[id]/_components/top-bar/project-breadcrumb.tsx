import { useProjectManager } from '@/components/store/project';
import { Routes } from '@/utils/constants';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { redirect, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

export const ProjectBreadcrumb = observer(() => {
    const projectManager = useProjectManager();
    const project = projectManager.project;
    const t = useTranslations();
    const closeTimeoutRef = useRef<Timer | null>(null);
    const router = useRouter();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

    const handleOpenProjectFolder = () => {
        // const project = projectsManager.project;
        // if (project && project.folderPath) {
        //     invokeMainChannel(MainChannels.OPEN_IN_EXPLORER, project.folderPath);
        // }
    };

    return (
        <div className="mx-2 flex flex-row items-center text-small gap-2">
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant={'ghost'}
                        className="mx-0 px-0 gap-2 text-foreground-onlook text-small hover:text-foreground-active hover:bg-transparent cursor-pointer group transition-colors duration-200"
                    >
                        <Icons.OnlookLogo
                            className={cn(
                                'w-9 h-9 hidden md:block transition-colors duration-200',
                                isClosingProject && 'animate-pulse',
                            )}
                        />
                        <span className="mx-0 max-w-[60px] md:max-w-[100px] lg:max-w-[200px] px-0 text-foreground-onlook text-small truncate cursor-pointer group-hover:text-foreground-active transition-colors duration-200">
                            {isClosingProject ? 'Stopping project...' : project?.name}
                        </span>
                        <Icons.ChevronDown className="transition-all rotate-0 group-data-[state=open]:-rotate-180 duration-200 ease-in-out text-foreground-onlook group-hover:text-foreground-active" />
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
                    <DropdownMenuItem onClick={() => router.push(Routes.HOME)}>
                        <div className="flex row center items-center group">
                            <Icons.Plus className="mr-2 group-hover:rotate-12 transition-transform" />
                            {t('projects.actions.newProject')}
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
});
