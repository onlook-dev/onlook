import { useProjectsManager } from '@/components/store/projects';
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

export function Settings({ project }: { project: Project }) {
    const projectsManager = useProjectsManager();
    const t = useTranslations();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [projectName, setProjectName] = useState(project.name);
    const isProjectNameEmpty = useMemo(() => projectName.length === 0, [projectName]);
    const [isDirectoryHovered, setIsDirectoryHovered] = useState(false);

    useEffect(() => {
        setProjectName(project.name);
    }, [project.name]);

    const handleDeleteProject = () => {
        projectsManager.deleteProject(project);
        setShowDeleteDialog(false);
    };

    const handleRenameProject = () => {
        projectsManager.updateProject({ ...project, name: projectName });
        setShowRenameDialog(false);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="default" variant="ghost" className="gap-2 w-full lg:w-auto">
                        <Icons.DotsVertical />
                        <p>{t('projects.actions.projectSettings')}</p>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem
                        onSelect={() => setShowRenameDialog(true)}
                        className="text-foreground-active hover:!bg-background-onlook hover:!text-foreground-active gap-2"
                    >
                        <Icons.Pencil className="w-4 h-4" />
                        {t('projects.actions.renameProject')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => setShowDeleteDialog(true)}
                        className="gap-2 text-red-400 hover:!bg-red-200/80 hover:!text-red-700 dark:text-red-200 dark:hover:!bg-red-800 dark:hover:!text-red-100"
                    >
                        <Icons.Trash className="w-4 h-4" />
                        {t('projects.actions.deleteProject')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('projects.dialogs.delete.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('projects.dialogs.delete.description')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant={'ghost'} onClick={() => setShowDeleteDialog(false)}>
                            {t('projects.actions.cancel')}
                        </Button>
                        <Button
                            variant={'destructive'}
                            className="rounded-md text-sm"
                            onClick={handleDeleteProject}
                        >
                            {t('projects.actions.delete')}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('projects.dialogs.rename.title')}</AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="flex flex-col w-full gap-2">
                        <Label htmlFor="text">{t('projects.dialogs.rename.label')}</Label>
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
                            {t('projects.dialogs.rename.error')}
                        </p>
                    </div>
                    <AlertDialogFooter>
                        <Button variant={'ghost'} onClick={() => setShowRenameDialog(false)}>
                            {t('projects.actions.cancel')}
                        </Button>
                        <Button
                            disabled={isProjectNameEmpty}
                            className="rounded-md text-sm"
                            onClick={handleRenameProject}
                        >
                            {t('projects.actions.rename')}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
