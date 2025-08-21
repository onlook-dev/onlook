import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { Tags } from '@onlook/constants';
import type { Project } from '@onlook/models';
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
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { cn } from '@onlook/ui/utils';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export function Settings({ project, refetch }: { project: Project; refetch: () => void }) {
    const t = useTranslations();
    const utils = api.useUtils();
    const { mutateAsync: deleteProject } = api.project.delete.useMutation();
    const { mutateAsync: updateProject } = api.project.update.useMutation();
    const { mutateAsync: addTag } = api.project.addTag.useMutation();
    const { mutateAsync: removeTag } = api.project.removeTag.useMutation();

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [projectName, setProjectName] = useState(project.name);
    const isProjectNameEmpty = useMemo(() => projectName.length === 0, [projectName]);
    const isTemplate = project.tags?.includes(Tags.TEMPLATE) || false;

    useEffect(() => {
        setProjectName(project.name);
    }, [project.name]);

    const handleDeleteProject = async () => {
        await deleteProject({ id: project.id });
        setShowDeleteDialog(false);
        refetch();
    };

    const handleRenameProject = async () => {
        await updateProject(
            {
                id: project.id,
                project: {
                    name: projectName,
                    updatedAt: new Date()
                },
            },
        );
        // Invalidate queries to refresh UI
        await Promise.all([
            utils.project.list.invalidate(),
            utils.project.get.invalidate({ projectId: project.id })
        ]);

        // Optimistically update list ordering and title immediately
        window.dispatchEvent(new CustomEvent('onlook_project_updated', {
            detail: {
                id: project.id,
                name: projectName,
                metadata: {
                    updatedAt: new Date().toISOString(),
                    description: project.metadata?.description,
                },
            },
        }));
        window.dispatchEvent(new CustomEvent('onlook_project_modified', { detail: { id: project.id } }));
        setShowRenameDialog(false);
        refetch();
    };

    const handleTemplateToggle = async () => {
        try {
            if (isTemplate) {
                await removeTag({ projectId: project.id, tag: Tags.TEMPLATE });
                toast.success('Removed from templates');
            } else {
                await addTag({ projectId: project.id, tag: Tags.TEMPLATE });
                toast.success('Added to templates');
            }

            // Invalidate and refetch both project lists and template lists
            await Promise.all([
                utils.project.list.invalidate(),
            ]);

            refetch();
        } catch (error) {
            toast.error('Failed to update template tag');
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        size="default"
                        variant="ghost"
                        className="w-8 h-8 p-0 flex items-center justify-center hover:bg-background-onlook cursor-pointer backdrop-blur-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Icons.DotsHorizontal />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className="z-50"
                    align="end"
                    alignOffset={-4}
                    sideOffset={8}
                    onClick={(e) => e.stopPropagation()}
                >
                    <DropdownMenuItem
                        onSelect={() => setShowRenameDialog(true)}
                        className="text-foreground-active hover:!bg-background-onlook hover:!text-foreground-active gap-2"
                    >
                        <Icons.Pencil className="w-4 h-4" />
                        {t(transKeys.projects.actions.renameProject)}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={handleTemplateToggle}
                        className="text-foreground-active hover:!bg-background-onlook hover:!text-foreground-active gap-2"
                    >
                        {isTemplate ? (
                            <Icons.CrossL className="w-4 h-4 text-purple-600" />
                        ) : (
                            <Icons.FilePlus className="w-4 h-4" />
                        )}
                        {isTemplate ? 'Unmark as template' : 'Create template'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => setShowDeleteDialog(true)}
                        className="gap-2 text-red-400 hover:!bg-red-200/80 hover:!text-red-700 dark:text-red-200 dark:hover:!bg-red-800 dark:hover:!text-red-100"
                    >
                        <Icons.Trash className="w-4 h-4" />
                        {t(transKeys.projects.actions.deleteProject)}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(transKeys.projects.dialogs.delete.title)}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(transKeys.projects.dialogs.delete.description)}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant={'ghost'} onClick={() => setShowDeleteDialog(false)}>
                            {t(transKeys.projects.actions.cancel)}
                        </Button>
                        <Button
                            variant={'destructive'}
                            className="rounded-md text-sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject();
                            }}
                        >
                            {t(transKeys.projects.actions.delete)}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(transKeys.projects.dialogs.rename.title)}</AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="flex flex-col w-full gap-2">
                        <Label htmlFor="text">{t(transKeys.projects.dialogs.rename.label)}</Label>
                        <Input
                            minLength={0}
                            type="text"
                            value={projectName || ''}
                            onInput={(e) => setProjectName(e.currentTarget.value)}
                        />
                        <p
                            className={cn(
                                'text-xs text-red-500 transition-opacity',
                                isProjectNameEmpty ? 'opacity-100' : 'opacity-0',
                            )}
                        >
                            {t(transKeys.projects.dialogs.rename.error)}
                        </p>
                    </div>
                    <AlertDialogFooter>
                        <Button variant={'ghost'} onClick={() => setShowRenameDialog(false)}>
                            {t(transKeys.projects.actions.cancel)}
                        </Button>
                        <Button
                            disabled={isProjectNameEmpty}
                            className="rounded-md text-sm"
                            onClick={handleRenameProject}
                        >
                            {t(transKeys.projects.actions.rename)}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
