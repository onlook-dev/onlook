import { useAuthContext } from '@/app/auth/auth-context';
import { useEditorEngine } from '@/components/store/editor';
import { useStateManager } from '@/components/store/state';
import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { toast } from '@onlook/ui/sonner';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { redirect, useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { useMemo, useRef, useState } from 'react';
import { NewProjectMenu } from './new-project-menu';
import { RecentProjectsMenu } from './recent-projects';

export const ProjectBreadcrumb = observer(() => {
    const editorEngine = useEditorEngine();
    const stateManager = useStateManager();
    const posthog = usePostHog();

    const { data: project } = api.project.get.useQuery({ projectId: editorEngine.projectId });
    const { data: user } = api.user.get.useQuery();
    const { mutateAsync: forkSandbox } = api.sandbox.fork.useMutation();
    const { mutateAsync: createProject } = api.project.create.useMutation();
    const { mutateAsync: cloneProject } = api.project.clone.useMutation();
    const { setIsAuthModalOpen } = useAuthContext();

    const t = useTranslations();
    const closeTimeoutRef = useRef<Timer | null>(null);
    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isClosingProject, setIsClosingProject] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Clone modal state
    const [showCloneDialog, setShowCloneDialog] = useState(false);
    const [cloneProjectName, setCloneProjectName] = useState('');
    const [isCloningCurrentProject, setIsCloningCurrentProject] = useState(false);
    
    // Generate default clone name
    const defaultCloneName = useMemo(() => {
        if (project?.name) {
            return `${project.name} (Clone)`;
        }
        return 'Cloned Project';
    }, [project?.name]);
    
    const isCloneProjectNameEmpty = useMemo(() => cloneProjectName.length === 0, [cloneProjectName]);

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

        const sandboxId = editorEngine.branches.activeBranch.sandbox.id
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

    function handleShowCloneDialog() {
        setCloneProjectName(defaultCloneName);
        setShowCloneDialog(true);
    }

    async function handleCloneCurrentProject() {
        if (!editorEngine.projectId) {
            toast.error('No project to clone');
            return;
        }

        setIsCloningCurrentProject(true);
        try {
            // Capture screenshot of current project before navigation
            try {
                editorEngine.screenshot.captureScreenshot();
            } catch (error) {
                console.error('Failed to capture screenshot:', error);
            }

            const clonedProject = await cloneProject({
                projectId: editorEngine.projectId,
                name: cloneProjectName.trim(),
            });

            if (clonedProject) {
                toast.success('Project cloned successfully');
                setShowCloneDialog(false);
                router.push(`${Routes.PROJECT}/${clonedProject.id}`);
            }
        } catch (error) {
            console.error('Error cloning project:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);

            if (errorMessage.includes('502') || errorMessage.includes('sandbox')) {
                toast.error('Sandbox service temporarily unavailable', {
                    description: 'Please try again in a few moments. Our servers may be experiencing high load.',
                });
            } else {
                toast.error('Failed to clone project', {
                    description: errorMessage,
                });
            }
        } finally {
            setIsCloningCurrentProject(false);
        }
    }

    return (
        <div className="mr-1 flex flex-row items-center text-small gap-2">
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant='ghost'
                        className="ml-1 px-0 gap-2 text-foreground-onlook text-small hover:text-foreground-active hover:!bg-transparent cursor-pointer group"
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
                        <div className="flex flex-row center items-center group">
                            <Icons.Tokens className="mr-2" />
                            {t(transKeys.projects.actions.goToAllProjects)}
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <RecentProjectsMenu />
                    <DropdownMenuSeparator />
                    <NewProjectMenu onShowCloneDialog={handleShowCloneDialog} />
                    <DropdownMenuItem
                        onClick={handleDownloadCode}
                        disabled={isDownloading}
                        className="cursor-pointer"
                    >
                        <div className="flex flex-row center items-center group">
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
                        <div className="flex flex-row center items-center group">
                            <Icons.Gear className="mr-2 group-hover:rotate-12 transition-transform" />
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
