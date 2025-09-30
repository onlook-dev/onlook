'use client';

import { api } from '@/trpc/react';
import { Tags } from '@onlook/constants';
import type { Project } from '@onlook/models';
import { DropdownMenuItem } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { toast } from 'sonner';

export function CreateTemplate({ project, refetch }: { project: Project; refetch: () => void }) {
    const utils = api.useUtils();
    const { mutateAsync: addTag } = api.project.addTag.useMutation();
    const { mutateAsync: removeTag } = api.project.removeTag.useMutation();
    const isTemplate = project.metadata.tags.includes(Tags.TEMPLATE) || false;

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
        <DropdownMenuItem
            onSelect={handleTemplateToggle}
            className="text-foreground-active hover:!bg-background-onlook hover:!text-foreground-active gap-2"
        >
            {isTemplate ? (
                <Icons.CrossL className="w-4 h-4 text-purple-600" />
            ) : (
                <Icons.FilePlus className="w-4 h-4" />
            )}
            {isTemplate ? 'Unmark as template' : 'Convert to template'}
        </DropdownMenuItem>
    );
}