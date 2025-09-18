'use client';

import { useAuthContext } from '@/app/auth/auth-context';
import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { LocalForageKeys, Routes } from '@/utils/constants';
import { SandboxTemplates, Templates } from '@onlook/constants';
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
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { toast } from '@onlook/ui/sonner';
import { cn } from '@onlook/ui/utils';
import localforage from 'localforage';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

export const NewProjectMenu = observer(() => {
    const editorEngine = useEditorEngine();
    const { data: user } = api.user.get.useQuery();
    const { data: currentProject } = api.project.get.useQuery(
        { projectId: editorEngine.projectId! },
        { enabled: !!editorEngine.projectId }
    );
    const { mutateAsync: forkSandbox } = api.sandbox.fork.useMutation();
    const { mutateAsync: createProject } = api.project.create.useMutation();
    const { mutateAsync: cloneProject } = api.project.clone.useMutation();
    const { setIsAuthModalOpen } = useAuthContext();
    const t = useTranslations();
    const router = useRouter();
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [isCloningCurrentProject, setIsCloningCurrentProject] = useState(false);
    const [showCloneDialog, setShowCloneDialog] = useState(false);
    const [cloneProjectName, setCloneProjectName] = useState('');
    
    // Generate default clone name
    const defaultCloneName = useMemo(() => {
        if (currentProject?.name) {
            return `${currentProject.name} (Clone)`;
        }
        return 'Cloned Project';
    }, [currentProject?.name]);
    
    const isCloneProjectNameEmpty = useMemo(() => cloneProjectName.length === 0, [cloneProjectName]);

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

    const handleShowCloneDialog = () => {
        if (!user?.id) {
            localforage.setItem(LocalForageKeys.RETURN_URL, window.location.pathname);
            setIsAuthModalOpen(true);
            return;
        }

        // Set default clone name and show dialog
        setCloneProjectName(defaultCloneName);
        setShowCloneDialog(true);
    };

    const handleCloneCurrentProject = async () => {
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
    };

    return (
        <>
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
                    <DropdownMenuItem
                        onClick={handleShowCloneDialog}
                        className="cursor-pointer"
                    >
                        <div className="flex flex-row center items-center group">
                            <Icons.Copy className="mr-2" />
                            Clone this project
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuSubContent>
            </DropdownMenuSub>

            <AlertDialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clone Project</AlertDialogTitle>
                        <AlertDialogDescription>
                            Create a copy of this project with all branches and settings preserved.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex flex-col w-full gap-2">
                        <Label htmlFor="clone-name">Project Name</Label>
                        <Input
                            id="clone-name"
                            type="text"
                            placeholder="Enter name for cloned project"
                            value={cloneProjectName}
                            onChange={(e) => setCloneProjectName(e.target.value)}
                        />
                        <p
                            className={cn(
                                'text-xs text-red-500 transition-opacity',
                                isCloneProjectNameEmpty ? 'opacity-100' : 'opacity-0',
                            )}
                        >
                            Project name can't be empty
                        </p>
                    </div>
                    <AlertDialogFooter>
                        <Button 
                            variant="ghost" 
                            onClick={() => setShowCloneDialog(false)} 
                            disabled={isCloningCurrentProject}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={isCloneProjectNameEmpty || isCloningCurrentProject}
                            onClick={handleCloneCurrentProject}
                        >
                            {isCloningCurrentProject ? (
                                <>
                                    <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                                    Cloning...
                                </>
                            ) : (
                                'Clone Project'
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
});
