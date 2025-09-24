'use client';

import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import type { Project } from '@onlook/models';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import { DropdownMenuItem } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { cn } from '@onlook/ui/utils';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export function CloneProject({ project, refetch }: { project: Project; refetch: () => void }) {
    const t = useTranslations();
    const utils = api.useUtils();
    const { mutateAsync: forkProject } = api.project.fork.useMutation();
    const [showCloneDialog, setShowCloneDialog] = useState(false);
    const [cloneProjectName, setCloneProjectName] = useState(`${project.name} (Clone)`);
    const [isCloningProject, setIsCloningProject] = useState(false);
    const isCloneProjectNameEmpty = useMemo(() => cloneProjectName.trim().length === 0, [cloneProjectName]);

    useEffect(() => {
        setCloneProjectName(`${project.name} (Clone)`);
    }, [project.name]);

    const handleCloneProject = async () => {
        setIsCloningProject(true);
        try {
            const clonedProject = await forkProject({
                projectId: project.id,
                name: cloneProjectName,
            });

            // Invalidate and refetch project lists
            await Promise.all([
                utils.project.list.invalidate(),
            ]);

            toast.success('Project cloned successfully');
            setShowCloneDialog(false);
            refetch();
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
            setIsCloningProject(false);
        }
    };

    return (
        <>
            <DropdownMenuItem
                onSelect={(event) => {
                    event.preventDefault();
                    setShowCloneDialog(true);
                }}
                className="text-foreground-active hover:!bg-background-onlook hover:!text-foreground-active gap-2"
            >
                <Icons.Copy className="w-4 h-4" />
                Clone Project
            </DropdownMenuItem>

            <AlertDialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clone Project</AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="flex flex-col w-full gap-2">
                        <Label htmlFor="clone-name">Project Name</Label>
                        <Input
                            id="clone-name"
                            minLength={0}
                            type="text"
                            placeholder="Enter name for cloned project"
                            value={cloneProjectName || ''}
                            onInput={(e) => setCloneProjectName(e.currentTarget.value)}
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
                        <Button variant={'ghost'} onClick={() => setShowCloneDialog(false)} disabled={isCloningProject}>
                            {t(transKeys.projects.actions.cancel)}
                        </Button>
                        <Button
                            disabled={isCloneProjectNameEmpty || isCloningProject}
                            className="rounded-md text-sm"
                            onClick={handleCloneProject}
                        >
                            {isCloningProject ? (
                                <>
                                    <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                                    Cloning...
                                </>
                            ) : (
                                'Clone'
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}