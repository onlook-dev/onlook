'use client';

import { useAuthContext } from '@/app/auth/auth-context';
import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { LocalForageKeys, Routes } from '@/utils/constants';
import { SandboxTemplates, Templates } from '@onlook/constants';
import {
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import localforage from 'localforage';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export const NewProjectMenu = observer(() => {
    const editorEngine = useEditorEngine();
    const { data: user } = api.user.get.useQuery();
    const { data: projects } = api.project.list.useQuery({ 
        excludeProjectId: editorEngine.projectId,
        limit: 10 
    });
    const { mutateAsync: forkSandbox } = api.sandbox.fork.useMutation();
    const { mutateAsync: createProject } = api.project.create.useMutation();
    const { mutateAsync: cloneProject } = api.project.clone.useMutation();
    const { setIsAuthModalOpen } = useAuthContext();
    const t = useTranslations();
    const router = useRouter();
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [isCloningProject, setIsCloningProject] = useState<string | null>(null);

    const handleStartBlankProject = async () => {
        if (!user?.id) {
            // Store the return URL and open auth modal
            await localforage.setItem(LocalForageKeys.RETURN_URL, window.location.pathname);
            setIsAuthModalOpen(true);
            return;
        }

        setIsCreatingProject(true);
        try {
            // Capture screenshot of current project before cleanup
            try {
                editorEngine.screenshot.captureScreenshot();
            } catch (error) {
                console.error('Failed to capture screenshot:', error);
            }

            // Create a blank project using the BLANK template
            const { sandboxId, previewUrl } = await forkSandbox({
                sandbox: SandboxTemplates[Templates.EMPTY_NEXTJS],
                config: {
                    title: `Blank project - ${user.id}`,
                    tags: ['blank', user.id],
                },
            });

            const newProject = await createProject({
                project: {
                    name: 'New Project',
                    description: 'Your new blank project',
                    tags: ['blank'],
                },
                sandboxId,
                sandboxUrl: previewUrl,
                userId: user.id,
            });

            if (newProject) {
                router.push(`${Routes.PROJECT}/${newProject.id}`);
            }
        } catch (error) {
            console.error('Error creating blank project:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);

            if (errorMessage.includes('502') || errorMessage.includes('sandbox')) {
                toast.error('Sandbox service temporarily unavailable', {
                    description: 'Please try again in a few moments. Our servers may be experiencing high load.',
                });
            } else {
                toast.error('Failed to create project', {
                    description: errorMessage,
                });
            }
        } finally {
            setIsCreatingProject(false);
        }
    };

    const handleCloneProject = async (projectId: string, projectName: string) => {
        if (!user?.id) {
            await localforage.setItem(LocalForageKeys.RETURN_URL, window.location.pathname);
            setIsAuthModalOpen(true);
            return;
        }

        setIsCloningProject(projectId);
        try {
            // Capture screenshot of current project before navigation
            try {
                editorEngine.screenshot.captureScreenshot();
            } catch (error) {
                console.error('Failed to capture screenshot:', error);
            }

            const clonedProject = await cloneProject({
                projectId,
                name: `${projectName} (Clone)`,
            });

            if (clonedProject) {
                toast.success('Project cloned successfully');
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
            setIsCloningProject(null);
        }
    };

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
                <div className="flex flex-row center items-center">
                    <Icons.Plus className="mr-2" />
                    {t(transKeys.projects.actions.newProject)}
                </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48 ml-2">
                <DropdownMenuItem
                    onClick={() => router.push(Routes.HOME)}
                    className="cursor-pointer"
                >
                    <div className="flex flex-row center items-center group">
                        <Icons.Plus className="mr-2" />
                        {t(transKeys.projects.actions.newProject)}
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={handleStartBlankProject}
                    disabled={isCreatingProject}
                    className="cursor-pointer"
                >
                    <div className="flex flex-row center items-center group">
                        {isCreatingProject ? (
                            <Icons.LoadingSpinner className="mr-2 animate-spin" />
                        ) : (
                            <Icons.FilePlus className="mr-2" />
                        )}
                        {t(transKeys.projects.actions.blankProject)}
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(Routes.IMPORT_PROJECT)}>
                    <div className="flex flex-row center items-center group">
                        <Icons.Upload className="mr-2" />
                        {t(transKeys.projects.actions.import)}
                    </div>
                </DropdownMenuItem>
                
                {projects && projects.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="cursor-pointer">
                                <div className="flex flex-row center items-center">
                                    <Icons.Copy className="mr-2" />
                                    Clone Project
                                </div>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-56 ml-2">
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b">
                                    Clone from project:
                                </div>
                                {projects.slice(0, 8).map((project) => (
                                    <DropdownMenuItem
                                        key={project.id}
                                        onClick={() => handleCloneProject(project.id, project.name)}
                                        disabled={isCloningProject !== null}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex flex-row center items-center group w-full">
                                            {isCloningProject === project.id ? (
                                                <Icons.LoadingSpinner className="mr-2 animate-spin flex-shrink-0" />
                                            ) : (
                                                <Icons.Copy className="mr-2 flex-shrink-0" />
                                            )}
                                            <span className="truncate">{project.name}</span>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                                {projects.length > 8 && (
                                    <div className="px-2 py-1.5 text-xs text-muted-foreground border-t">
                                        +{projects.length - 8} more projects
                                    </div>
                                )}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </>
                )}
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    );
});
