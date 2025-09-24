import { useRef, useState } from 'react';
import { redirect } from 'next/navigation';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { usePostHog } from 'posthog-js/react';

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

import { useEditorEngine } from '@/components/store/editor';
import { useStateManager } from '@/components/store/state';
import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { CloneProjectDialog } from '../clone-project-dialog';
import { NewProjectMenu } from './new-project-menu';
import { RecentProjectsMenu } from './recent-projects';

export const ProjectBreadcrumb = observer(() => {
    const editorEngine = useEditorEngine();
    const stateManager = useStateManager();
    const posthog = usePostHog();
    const { data: project } = api.project.get.useQuery({ projectId: editorEngine.projectId });
    const t = useTranslations();
    const closeTimeoutRef = useRef<Timer | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isClosingProject, setIsClosingProject] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showCloneDialog, setShowCloneDialog] = useState(false);

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
        if (!project) {
            console.error('No project found');
            return;
        }

        const sandboxId = editorEngine.branches.activeBranch.sandbox.id;
        if (!sandboxId) {
            console.error('No sandbox ID found');
            return;
        }

        try {
            setIsDownloading(true);

            const result = await editorEngine.activeSandbox.downloadFiles(project.name);

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
        <div className="text-small mr-1 flex flex-row items-center gap-2">
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="text-foreground-onlook text-small hover:text-foreground-active group ml-1 cursor-pointer gap-2 px-0 hover:!bg-transparent"
                    >
                        <Icons.OnlookLogo
                            className={cn(
                                'hidden h-9 w-9 md:block',
                                isClosingProject && 'animate-pulse',
                            )}
                        />
                        <span className="text-foreground-onlook text-small group-hover:text-foreground-active mx-0 max-w-[60px] cursor-pointer truncate px-0 md:max-w-[100px] lg:max-w-[200px]">
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
                        <div className="center group flex flex-row items-center">
                            <Icons.Tokens className="mr-2" />
                            {t(transKeys.projects.actions.goToAllProjects)}
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <RecentProjectsMenu />
                    <DropdownMenuSeparator />
                    <NewProjectMenu onShowCloneDialog={setShowCloneDialog} />
                    <DropdownMenuItem
                        onClick={handleDownloadCode}
                        disabled={isDownloading}
                        className="cursor-pointer"
                    >
                        <div className="center group flex flex-row items-center">
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
                        <div className="center group flex flex-row items-center">
                            <Icons.Gear className="mr-2 transition-transform group-hover:rotate-12" />
                            {t(transKeys.help.menu.openSettings)}
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <CloneProjectDialog
                isOpen={showCloneDialog}
                onClose={() => setShowCloneDialog(false)}
                projectName={project?.name}
            />
        </div>
    );
});
