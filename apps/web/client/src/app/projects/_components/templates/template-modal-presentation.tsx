"use client";

import type { Project } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { AnimatePresence, motion } from "motion/react";

interface TemplateModalPresentationProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    image: string | null;
    isNew?: boolean;
    isStarred?: boolean;
    onToggleStar?: () => void;
    templateProject: Project;
    isCreatingProject?: boolean;
    onUseTemplate?: () => void;
    onPreviewTemplate?: () => void;
    onEditTemplate?: () => void;
    onUnmarkTemplate?: () => void;
}

/**
 * TemplateModalPresentation - Pure presentational version of TemplateModal.
 * Receives all data and callbacks as props instead of using hooks/context.
 */
export function TemplateModalPresentation({
    isOpen,
    onClose,
    title,
    description,
    image,
    isNew = false,
    isStarred = false,
    onToggleStar,
    isCreatingProject = false,
    onUseTemplate,
    onPreviewTemplate,
    onEditTemplate,
    onUnmarkTemplate,
}: TemplateModalPresentationProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-background border border-border rounded-2xl max-w-4xl w-full max-h-[80vh] flex relative shadow-2xl"
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            size="sm"
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/20 hover:bg-secondary transition-colors"
                        >
                            <Icons.CrossS className="w-4 h-4" />
                        </Button>

                        <div className="w-1/2 bg-secondary relative rounded-l-2xl overflow-hidden">
                            {image ? (
                                <img
                                    src={image}
                                    alt={`${title} template preview`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-t from-gray-800/40 via-gray-500/40 to-gray-400/40" />
                            )}

                            {isNew && (
                                <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                                    New
                                </div>
                            )}
                        </div>

                        <div className="w-1/2 p-8 flex flex-col overflow-visible min-h-80">
                            <h2 className="text-2xl font-semibold text-foreground mb-4">
                                {title}
                            </h2>

                            <p className="text-foreground-secondary text-base leading-relaxed mb-8 flex-1">
                                {description}
                            </p>

                            <div className="flex items-center gap-3 overflow-visible">
                                <Button
                                    className="flex-1"
                                    size="lg"
                                    onClick={onUseTemplate}
                                    disabled={isCreatingProject}
                                >
                                    {isCreatingProject ? (
                                        <div className="flex items-center gap-2">
                                            <Icons.LoadingSpinner className="w-4 h-4 animate-spin" />
                                            Creating...
                                        </div>
                                    ) : (
                                        'Use Template'
                                    )}
                                </Button>

                                {onToggleStar && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                onClick={onToggleStar}
                                                aria-label={isStarred ? "Remove from favorites" : "Add to favorites"}
                                            >
                                                {isStarred ? (
                                                    <Icons.BookmarkFilled
                                                        className="w-5 h-5 text-white"
                                                    />
                                                ) : (
                                                    <Icons.Bookmark
                                                        className="w-5 h-5 text-foreground-tertiary"
                                                    />
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Mark as favorite</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="lg"
                                            aria-label="Template options"
                                        >
                                            <Icons.DotsHorizontal className="w-5 h-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        {onPreviewTemplate && (
                                            <DropdownMenuItem onClick={onPreviewTemplate}>
                                                <Icons.EyeOpen className="w-4 h-4 mr-3" />
                                                Preview
                                            </DropdownMenuItem>
                                        )}
                                        {onEditTemplate && (
                                            <DropdownMenuItem onClick={onEditTemplate}>
                                                <Icons.Edit className="w-4 h-4 mr-3" />
                                                Edit
                                            </DropdownMenuItem>
                                        )}
                                        {onUnmarkTemplate && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={onUnmarkTemplate}
                                                    className="text-foreground-secondary focus:text-foreground"
                                                >
                                                    <Icons.CrossL className="w-4 h-4 mr-3" />
                                                    Remove Template
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
