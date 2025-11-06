'use client';

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
import { motion } from 'motion/react';
import { useMemo } from 'react';

interface ProjectCardPresentationProps {
    project: Project;
    /** Resolved image URL (should be pre-resolved, not storage path) */
    imageUrl?: string | null;
    aspectRatio?: string;
    searchQuery?: string;
    HighlightText?: React.ComponentType<{ text: string; searchQuery: string }>;
    /** Callback when edit button is clicked */
    onEdit?: (project: Project) => void;
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
 * ProjectCardPresentation - Pure presentational version of ProjectCard.
 * Takes all data as props, including pre-resolved image URLs.
 */
export function ProjectCardPresentation({
    project,
    imageUrl,
    aspectRatio = "aspect-[4/2.6]",
    searchQuery = "",
    HighlightText,
    onEdit,
    onRename,
    onClone,
    onToggleTemplate,
    onDelete,
    isTemplate = false,
}: ProjectCardPresentationProps) {
    const SHOW_DESCRIPTION = false;
    const lastUpdated = useMemo(() => timeAgo(project.metadata.updatedAt), [project.metadata.updatedAt]);

    const handleEdit = () => {
        onEdit?.(project);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="w-full break-inside-avoid cursor-pointer"
            onClick={handleEdit}
        >
            <div className={`relative ${aspectRatio} rounded-lg overflow-hidden shadow-sm hover:shadow-xl hover:shadow-black/20 transition-all duration-300 group`}>
                {imageUrl ? (
                    <img src={imageUrl} alt={project.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                ) : (
                    <>
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-gray-800/40 via-gray-500/40 to-gray-400/40" />
                        <div className="absolute inset-0 rounded-lg border-[0.5px] border-gray-500/70" style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' }} />
                    </>
                )}

                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30">
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
                            {onRename && (
                                <DropdownMenuItem
                                    onSelect={(event) => {
                                        event.preventDefault();
                                        onRename(project);
                                    }}
                                    className="text-foreground-active hover:!bg-background-onlook hover:!text-foreground-active gap-2"
                                >
                                    <Icons.Pencil className="w-4 h-4" />
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
                                    <Icons.Copy className="w-4 h-4" />
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
                                            <Icons.CrossL className="w-4 h-4 text-purple-600" />
                                            Unmark as template
                                        </>
                                    ) : (
                                        <>
                                            <Icons.FilePlus className="w-4 h-4" />
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
                                    <Icons.Trash className="w-4 h-4" />
                                    Delete Project
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {onEdit && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-20">
                        <Button
                            size="default"
                            onClick={handleEdit}
                            className="gap-2 border border-gray-300 w-auto cursor-pointer bg-white text-black hover:bg-gray-100"
                        >
                            <Icons.PencilPaper />
                            <p>Edit App</p>
                        </Button>
                    </div>
                )}

                <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/20 to-transparent p-4 h-32 transition-all duration-300 group-hover:from-background group-hover:via-background/40"
                    style={{ bottom: "-1px", left: "-1px", right: "-1px" }}
                >
                    <div className="flex justify-between items-end h-full">
                        <div>
                            <div className="text-white font-medium text-base mb-1 truncate drop-shadow-lg">
                                {HighlightText ? (
                                    <HighlightText text={project.name} searchQuery={searchQuery} />
                                ) : (
                                    project.name
                                )}
                            </div>
                            <div className="text-white/70 text-xs mb-1 drop-shadow-lg flex items-center">
                                <span>{lastUpdated} ago</span>
                            </div>
                            {SHOW_DESCRIPTION && project.metadata?.description && (
                                <div className="text-white/60 text-xs line-clamp-1 drop-shadow-lg">
                                    {HighlightText ? (
                                        <HighlightText text={project.metadata.description} searchQuery={searchQuery} />
                                    ) : (
                                        project.metadata.description
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
