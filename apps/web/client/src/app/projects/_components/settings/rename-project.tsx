'use client';

import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import type { Project } from '@onlook/models';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@onlook/ui/dialog';
import { Button } from '@onlook/ui/button';
import { DropdownMenuItem } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { cn } from '@onlook/ui/utils';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

export function RenameProject({ project, refetch }: { project: Project; refetch: () => void }) {
    const t = useTranslations();
    const utils = api.useUtils();
    const { mutateAsync: updateProject } = api.project.update.useMutation();
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [projectName, setProjectName] = useState(project.name);
    const isProjectNameEmpty = useMemo(() => projectName.length === 0, [projectName]);

    useEffect(() => {
        setProjectName(project.name);
    }, [project.name]);

    const handleRenameProject = async () => {
        await updateProject(
            {
                id: project.id,
                name: projectName,
                updatedAt: new Date()
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

    return (
        <>
            <DropdownMenuItem
                onSelect={(event) => {
                    event.preventDefault();
                    setShowRenameDialog(true);
                }}
                className="text-foreground-active hover:!bg-background-onlook hover:!text-foreground-active gap-2"
            >
                <Icons.Pencil className="w-4 h-4" />
                {t(transKeys.projects.actions.renameProject)}
            </DropdownMenuItem>

            <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t(transKeys.projects.dialogs.rename.title)}</DialogTitle>
                    </DialogHeader>
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
                    <DialogFooter>
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
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}