'use client';

import { useEditorEngine } from '@/components/store/editor';
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
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { toast } from '@onlook/ui/sonner';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

interface CloneProjectDialogProps {
    isOpen: boolean;
    onClose: () => void;
    projectName?: string;
}

export const CloneProjectDialog = observer(({ isOpen, onClose, projectName }: CloneProjectDialogProps) => {
    const editorEngine = useEditorEngine();
    const router = useRouter();
    const { mutateAsync: cloneProject } = api.project.fork.useMutation();
    const [cloneProjectName, setCloneProjectName] = useState(projectName ? `${projectName} (Clone)` : '');
    const [isCloningCurrentProject, setIsCloningCurrentProject] = useState(false);

    // Generate default clone name
    const defaultCloneName = useMemo(() => {
        if (projectName) {
            return `${projectName} (Clone)`;
        }
        return 'Cloned Project';
    }, [projectName]);

    const isCloneProjectNameEmpty = useMemo(() => cloneProjectName.trim().length === 0, [cloneProjectName]);

    // Reset the form when dialog opens
    const handleOpenChange = (open: boolean) => {
        if (open && isOpen) {
            setCloneProjectName(defaultCloneName);
        } else if (!open) {
            onClose();
            // Reset form after closing
            setTimeout(() => {
                setCloneProjectName('');
                setIsCloningCurrentProject(false);
            }, 200);
        }
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
                onClose();
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
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
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
                        onClick={() => handleOpenChange(false)}
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
    );
});