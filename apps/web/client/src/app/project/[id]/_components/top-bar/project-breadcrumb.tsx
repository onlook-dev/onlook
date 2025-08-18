import { useEditorEngine } from '@/components/store/editor';
import { useStateManager } from '@/components/store/state';
import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { redirect, useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { useRef, useState } from 'react';
import { RecentProjectsMenu } from './recent-projects';

export const ProjectBreadcrumb = observer(() => {
    const editorEngine = useEditorEngine();
    const stateManager = useStateManager();
    const posthog = usePostHog();

    const { data: project } = api.project.get.useQuery({ projectId: editorEngine.projectId });

    const t = useTranslations();
    const closeTimeoutRef = useRef<Timer | null>(null);
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isClosingProject, setIsClosingProject] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    async function handleNavigateToProjects(_route?: 'create' | 'import') {
        try {
            setIsClosingProject(true);

            editorEngine.screenshot.captureScreenshot();
        } catch (error) {
            console.error('Failed to take screenshots:', error);
        } finally {
            setTimeout(() => {
                setIsClosingProject(false);
                redirect('/projects');
            }, 100);
        }
    }

    async function handleDownloadCode() {
        if (!project?.sandbox?.id) {
            console.error('No sandbox ID found');
            return;
        }

        try {
            setIsDownloading(true);

            const result = await editorEngine.sandbox.downloadFiles(project.name);

            if (result) {
                window.open(result.downloadUrl, '_blank');

                posthog.capture('download_project_code', {
                    projectId: project.id,
                    projectName: project.name,
                });

                toast.success(t(transKeys.projects.actions.downloadSuccess));
            } else {
                throw new Error('Failed to generate download URL');
            }
        } catch (error) {
            console.error('Download failed:', error);
            toast.error(t(transKeys.projects.actions.downloadError), {
                description: error instanceof Error ? error.message : 'Unknown error',
            });

            posthog.capture('download_project_code_failed', {
                projectId: project.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsDownloading(false);
        }
    }

    return (
        <div className="mx-2 flex flex-row items-center text-small gap-2">
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant={'ghost'}
                        className="mx-0 px-0 gap-2 text-foreground-onlook text-small hover:text-foreground-active hover:bg-transparent cursor-pointer group"
                    >
                        <Icons.OnlookLogo
                            className={cn(
                                'w-9 h-9 hidden md:block',
                                isClosingProject && 'animate-pulse',
                            )}
                        />
                        <span className="mx-0 max-w-[60px] md:max-w-[100px] lg:max-w-[200px] px-0 text-foreground-onlook text-small truncate cursor-pointer group-hover:text-foreground-active">
                            {isClosingProject ? 'Stopping project...' : project?.name}
                        </span>
                        <Icons.ChevronDown className="text-foreground-onlook group-hover:text-foreground-active" />
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
                    <DropdownMenuItem
                        onClick={() => handleNavigateToProjects()}
                        className="cursor-pointer"
                    >
                        <div className="flex row center items-center group">
                            <Icons.Tokens className="mr-2" />
                            {t(transKeys.projects.actions.goToAllProjects)}
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <RecentProjectsMenu />
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => router.push(Routes.HOME)}
                        className="cursor-pointer"
                    >
                        <div className="flex row center items-center group">
                            <Icons.Plus className="mr-2" />
                            {t(transKeys.projects.actions.newProject)}
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(Routes.IMPORT_PROJECT)}>
                        <div className="flex row center items-center group">
                            <Icons.Upload className="mr-2" />
                            {t(transKeys.projects.actions.import)}
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={handleDownloadCode}
                        disabled={isDownloading}
                        className="cursor-pointer"
                    >
                        <div className="flex row center items-center group">
                            <Icons.Download className="mr-2" />
                            {isDownloading
                                ? t(transKeys.projects.actions.downloadingCode)
                                : t(transKeys.projects.actions.downloadCode)}
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => (stateManager.isSettingsModalOpen = true)}
                    >
                        <div className="flex row center items-center group">
                            <Icons.Gear className="mr-2 group-hover:rotate-12 transition-transform" />
                            {t(transKeys.help.menu.openSettings)}
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
});
