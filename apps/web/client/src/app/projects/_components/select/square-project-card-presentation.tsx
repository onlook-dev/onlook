'use client';

import { useMemo } from 'react';

import type { Project } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { timeAgo } from '@onlook/utility';

interface SquareProjectCardPresentationProps {
    project: Project;
    /** Resolved image URL (should be pre-resolved, not storage path) */
    imageUrl?: string | null;
    searchQuery?: string;
    HighlightText?: React.ComponentType<{ text: string; searchQuery: string }>;
    /** Callback when card is clicked */
    onClick?: (project: Project) => void;
    /** Callback when rename is clicked */
    onRename?: (project: Project) => void;
    /** Callback when clone is clicked */
    onClone?: (project: Project) => void;
    /** Callback when convert to/from template is clicked */
    onToggleTemplate?: (project: Project) => void;
    /** Callback when delete is clicked */
    onDelete?: (project: Project) => void;
    /** Whether this project is a template */
    isTemplate?: boolean;
}

/**
 * SquareProjectCardPresentation - Pure presentational version of SquareProjectCard.
 * Takes all data as props, including pre-resolved image URLs.
 */
export function SquareProjectCardPresentation({
    project,
    imageUrl,
    searchQuery = '',
    HighlightText,
    onClick,
    onRename,
    onClone,
    onToggleTemplate,
    onDelete,
    isTemplate = false,
}: SquareProjectCardPresentationProps) {
    const lastUpdated = useMemo(
        () => timeAgo(project.metadata.updatedAt),
        [project.metadata.updatedAt],
    );

    const handleClick = () => {
        onClick?.(project);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    return (
        <div
            className="group cursor-pointer transition-all duration-300"
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
        >
            <div
                className={`relative aspect-[4/2.8] w-full overflow-hidden rounded-lg shadow-sm transition-all duration-300`}
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={project.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <>
                        <div className="absolute inset-0 h-full w-full bg-gradient-to-t from-gray-800/40 via-gray-500/40 to-gray-400/40" />
                        <div
                            className="absolute inset-0 rounded-lg border-[0.5px] border-gray-500/70"
                            style={{
                                maskImage:
                                    'linear-gradient(to bottom, black 60%, transparent 100%)',
                            }}
                        />
                    </>
                )}

                <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />

                <div className="absolute top-3 right-3 z-30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="default"
                                variant="ghost"
                                className="hover:bg-background-onlook flex h-8 w-8 cursor-pointer items-center justify-center p-0 backdrop-blur-lg"
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
                            {onRename && (
                                <DropdownMenuItem
                                    onSelect={(event) => {
                                        event.preventDefault();
                                        onRename(project);
                                    }}
                                    className="text-foreground-active hover:!bg-background-onlook hover:!text-foreground-active gap-2"
                                >
                                    <Icons.Pencil className="h-4 w-4" />
                                    Rename Project
                                </DropdownMenuItem>
                            )}
                            {onClone && (
                                <DropdownMenuItem
                                    onSelect={(event) => {
                                        event.preventDefault();
                                        onClone(project);
                                    }}
                                    className="text-foreground-active hover:!bg-background-onlook hover:!text-foreground-active gap-2"
                                >
                                    <Icons.Copy className="h-4 w-4" />
                                    Clone Project
                                </DropdownMenuItem>
                            )}
                            {onToggleTemplate && (
                                <DropdownMenuItem
                                    onSelect={(event) => {
                                        event.preventDefault();
                                        onToggleTemplate(project);
                                    }}
                                    className="text-foreground-active hover:!bg-background-onlook hover:!text-foreground-active gap-2"
                                >
                                    {isTemplate ? (
                                        <>
                                            <Icons.CrossL className="h-4 w-4 text-purple-600" />
                                            Unmark as template
                                        </>
                                    ) : (
                                        <>
                                            <Icons.FilePlus className="h-4 w-4" />
                                            Convert to template
                                        </>
                                    )}
                                </DropdownMenuItem>
                            )}
                            {onDelete && (
                                <DropdownMenuItem
                                    onSelect={(event) => {
                                        event.preventDefault();
                                        onDelete(project);
                                    }}
                                    className="gap-2 text-red-400 hover:!bg-red-200/80 hover:!text-red-700 dark:text-red-200 dark:hover:!bg-red-800 dark:hover:!text-red-100"
                                >
                                    <Icons.Trash className="h-4 w-4" />
                                    Delete Project
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {onClick && (
                    <div className="bg-background/30 absolute inset-0 z-30 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClick();
                            }}
                            className="w-auto cursor-pointer gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-black hover:bg-gray-100"
                        >
                            ✏️ Edit
                        </button>
                    </div>
                )}

                <div className="absolute right-0 bottom-0 left-0 z-10 p-3 transition-opacity duration-300 group-hover:opacity-50">
                    <div className="mb-1 truncate text-sm font-medium text-white drop-shadow-lg">
                        {HighlightText ? (
                            <HighlightText text={project.name} searchQuery={searchQuery} />
                        ) : (
                            project.name
                        )}
                    </div>
                    <div className="mb-1 flex items-center text-xs text-white/70 drop-shadow-lg">
                        <span>{lastUpdated} ago</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
