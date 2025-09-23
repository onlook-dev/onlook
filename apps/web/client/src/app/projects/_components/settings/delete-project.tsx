'use client';

import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import type { Project } from '@onlook/models';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import { DropdownMenuItem } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export function DeleteProject({ project, refetch }: { project: Project; refetch: () => void }) {
    const t = useTranslations();
    const { mutateAsync: deleteProject } = api.project.delete.useMutation();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleDeleteProject = async () => {
        await deleteProject({ id: project.id });
        setShowDeleteDialog(false);
        refetch();
    };

    return (
        <>
            <DropdownMenuItem
                onSelect={(event) => {
                    event.preventDefault();
                    setShowDeleteDialog(true);
                }}
                className="gap-2 text-red-400 hover:!bg-red-200/80 hover:!text-red-700 dark:text-red-200 dark:hover:!bg-red-800 dark:hover:!text-red-100"
            >
                <Icons.Trash className="w-4 h-4" />
                {t(transKeys.projects.actions.deleteProject)}
            </DropdownMenuItem>
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
        </>
    );
}