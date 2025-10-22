'use client';

import { Icons } from '@onlook/ui/icons/index';

import { useCreateBlankProject } from '@/hooks/use-create-blank-project';

export function StartBlank() {
    const { handleStartBlankProject, isCreatingProject } = useCreateBlankProject();

    return (
        <button
            onClick={handleStartBlankProject}
            disabled={isCreatingProject}
            className="text-foreground-secondary hover:text-foreground disabled:hover:text-foreground-secondary flex items-center gap-2 text-sm transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {isCreatingProject ? (
                <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
            ) : (
                <Icons.File className="h-4 w-4" />
            )}
            Start a Blank Project
        </button>
    );
}
