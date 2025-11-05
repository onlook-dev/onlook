'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Carousel } from './carousel';
import { AnimatePresence, motion } from 'motion/react';

import type { Project } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

import { Templates } from './templates';
import { TemplateModalPresentation } from './templates/template-modal-presentation';
import { HighlightText } from './select/highlight-text';
import { MasonryLayout } from './select/masonry-layout';
import { ProjectCardPresentation } from './select/project-card-presentation';
import { SquareProjectCardPresentation } from './select/square-project-card-presentation';

interface SelectProjectPresentationProps {
    /** All projects including templates */
    allProjects?: Project[];
    /** Whether projects are loading */
    isLoading?: boolean;
    /** Search query from parent */
    externalSearchQuery?: string;
    /** Whether a project is being created */
    isCreatingProject?: boolean;
    /** Callback to create blank project */
    onCreateBlank?: () => void;
    /** Starred template IDs */
    starredTemplateIds?: Set<string>;
    /** Callback to toggle template star */
    onToggleStar?: (templateId: string) => void;
    /** Callback to unmark template */
    onUnmarkTemplate?: (projectId: string) => void;
    /** Callback when project needs refetch */
    onRefetch?: () => void;
    /** Current user */
    user?: { id: string; email: string | null } | null;
    /** Callback when a project is clicked/edited */
    onProjectClick?: (project: Project) => void;
    /** Callback when rename project is clicked */
    onRenameProject?: (project: Project) => void;
    /** Callback when clone project is clicked */
    onCloneProject?: (project: Project) => void;
    /** Callback when toggle template is clicked */
    onToggleTemplate?: (project: Project) => void;
    /** Callback when delete project is clicked */
    onDeleteProject?: (project: Project) => void;
    /** Callback when template is used */
    onUseTemplate?: (templateId: string) => void;
    /** Callback when template preview is clicked */
    onPreviewTemplate?: (templateId: string) => void;
    /** Callback when template edit is clicked */
    onEditTemplate?: (templateId: string) => void;
}

/**
 * SelectProjectPresentation - Pure presentational version of SelectProject component.
 * Receives all data as props instead of using tRPC/context hooks.
 */
// Helper function to resolve image URL from project metadata
const getImageUrl = (project: Project): string | null => {
    const preview = project.metadata?.previewImg;
    if (!preview) return null;
    if (preview.type === 'url' && preview.url) {
        return preview.url;
    }
    // For storage paths, return null - stories should use type: 'url'
    return null;
};

export const SelectProjectPresentation = ({
    allProjects = [],
    isLoading = false,
    externalSearchQuery = '',
    isCreatingProject = false,
    onCreateBlank,
    starredTemplateIds = new Set(),
    onToggleStar,
    onUnmarkTemplate,
    onRefetch,
    user,
    onProjectClick,
    onRenameProject,
    onCloneProject,
    onToggleTemplate,
    onDeleteProject,
    onUseTemplate,
    onPreviewTemplate,
    onEditTemplate,
}: SelectProjectPresentationProps) => {
    // Search and filters
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const searchQuery = externalSearchQuery;
    const [filesOrderBy, setFilesOrderBy] = useState<'Newest first' | 'Oldest first'>(
        'Newest first',
    );
    const [filesSortBy, setFilesSortBy] = useState<'Alphabetical' | 'Date created' | 'Last viewed'>(
        'Last viewed',
    );

    // Settings
    const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
    const settingsDropdownRef = useRef<HTMLDivElement>(null);
    const [layoutMode, setLayoutMode] = useState<'masonry' | 'grid'>('masonry');
    const [spacing] = useState<number>(24);

    // Templates
    const projects = useMemo(
        () => allProjects.filter((project) => !project.metadata.tags.includes('template')),
        [allProjects],
    );
    const templateProjects = useMemo(
        () => allProjects.filter((project) => project.metadata.tags.includes('template')),
        [allProjects],
    );
    const shouldShowTemplate = templateProjects.length > 0;
    const [selectedTemplate, setSelectedTemplate] = useState<Project | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

    const handleTemplateClick = (project: Project) => {
        setSelectedTemplate(project);
        setIsTemplateModalOpen(true);
    };

    const handleCloseTemplateModal = () => {
        setIsTemplateModalOpen(false);
        setSelectedTemplate(null);
    };

    const handleToggleStar = (templateId: string) => {
        onToggleStar?.(templateId);
    };

    const handleUnmarkTemplate = async () => {
        if (!selectedTemplate?.id) return;
        await onUnmarkTemplate?.(selectedTemplate.id);
        setIsTemplateModalOpen(false);
        setSelectedTemplate(null);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 100);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const filteredAndSortedProjects = useMemo(() => {
        let filtered = projects;
        if (debouncedSearchQuery) {
            const q = debouncedSearchQuery.toLowerCase();
            filtered = projects.filter((p) =>
                [p.name, p.metadata?.description ?? '', p.metadata.tags.join(', ')].some((s) =>
                    (s ?? '').toLowerCase().includes(q),
                ),
            );
        }
        return [...filtered].sort(
            (a, b) =>
                new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime(),
        );
    }, [projects, debouncedSearchQuery]);

    const filesProjects = useMemo(() => {
        const sorted = [...filteredAndSortedProjects].sort((a, b) => {
            switch (filesSortBy) {
                case 'Alphabetical':
                    return a.name.localeCompare(b.name);
                case 'Date created':
                    return (
                        new Date(a.metadata.createdAt).getTime() -
                        new Date(b.metadata.createdAt).getTime()
                    );
                case 'Last viewed':
                default:
                    return (
                        new Date(b.metadata.updatedAt).getTime() -
                        new Date(a.metadata.updatedAt).getTime()
                    );
            }
        });
        return filesOrderBy === 'Oldest first' ? sorted.reverse() : sorted;
    }, [filteredAndSortedProjects, filesSortBy, filesOrderBy]);

    const sortOptions = [
        { value: 'Alphabetical', label: 'Alphabetical' },
        { value: 'Date created', label: 'Date created' },
        { value: 'Last viewed', label: 'Last viewed' },
    ] as const;

    const orderOptions = [
        { value: 'Oldest first', label: 'Oldest first' },
        { value: 'Newest first', label: 'Newest first' },
    ] as const;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                settingsDropdownRef.current &&
                !settingsDropdownRef.current.contains(event.target as Node)
            ) {
                setIsSettingsDropdownOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center">
                <div className="flex flex-row items-center gap-2">
                    <Icons.LoadingSpinner className="text-foreground-primary h-6 w-6 animate-spin" />
                    <div className="text-foreground-secondary text-lg">Loading projects...</div>
                </div>
            </div>
        );
    }

    if (projects.length === 0 && !debouncedSearchQuery) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                <div className="text-foreground-secondary text-xl">No projects found</div>
                <div className="text-md text-foreground-tertiary">
                    Create a new project to get started
                </div>
                <div className="flex justify-center">
                    <Button
                        onClick={onCreateBlank}
                        disabled={isCreatingProject}
                        variant="default"
                    >
                        {isCreatingProject ? (
                            <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                        ) : (
                            <Icons.Plus className="h-4 w-4" />
                        )}
                        Create blank project
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="relative flex h-full w-full flex-col overflow-x-visible px-6 py-8"
            style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
            }}
        >
            <div className="mx-auto w-full max-w-6xl overflow-x-visible">
                <div className="mb-12 overflow-x-visible">
                    <h2 className="text-foreground mb-[12px] text-2xl font-normal">
                        Recent projects
                    </h2>

                    <Carousel gap="gap-4" className="h-[202px] pb-4">
                        <AnimatePresence mode="popLayout">
                            {filteredAndSortedProjects.length === 0 ? (
                                <motion.div
                                    key="no-results"
                                    className="flex w-full items-center justify-center"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <div className="text-center">
                                        <div className="text-foreground-secondary text-base">
                                            No projects found
                                        </div>
                                        <div className="text-foreground-tertiary text-sm">
                                            Try adjusting your search terms
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                [
                                    <motion.div
                                        key="create-tile"
                                        className="w-72 flex-shrink-0"
                                        initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            filter: 'blur(0px)',
                                            transition: {
                                                duration: 0.4,
                                                ease: [0.25, 0.46, 0.45, 0.94],
                                            },
                                        }}
                                        exit={{
                                            opacity: 0,
                                            y: -20,
                                            filter: 'blur(10px)',
                                            transition: { duration: 0.2 },
                                        }}
                                        layout
                                    >
                                        <button
                                            onClick={onCreateBlank}
                                            disabled={isCreatingProject}
                                            className="border-border bg-secondary/40 hover:bg-secondary relative flex aspect-[4/2.8] w-full items-center justify-center rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="text-foreground-tertiary flex flex-col items-center justify-center">
                                                {isCreatingProject ? (
                                                    <Icons.LoadingSpinner className="mb-1 h-7 w-7 animate-spin" />
                                                ) : (
                                                    <Icons.Plus className="mb-1 h-7 w-7" />
                                                )}
                                                <span className="text-sm">Create</span>
                                            </div>
                                        </button>
                                    </motion.div>,
                                    /* Project cards */
                                    ...filteredAndSortedProjects.map((project, index) => (
                                        <motion.div
                                            key={project.id}
                                            className="w-72 flex-shrink-0"
                                            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                                filter: 'blur(0px)',
                                                transition: {
                                                    duration: 0.4,
                                                    delay: (index + 1) * 0.1,
                                                    ease: [0.25, 0.46, 0.45, 0.94],
                                                },
                                            }}
                                            exit={{
                                                opacity: 0,
                                                y: -20,
                                                filter: 'blur(10px)',
                                                transition: { duration: 0.2 },
                                            }}
                                            layout
                                        >
                                            <SquareProjectCardPresentation
                                                project={project}
                                                imageUrl={getImageUrl(project)}
                                                searchQuery={debouncedSearchQuery}
                                                HighlightText={HighlightText}
                                                onClick={onProjectClick}
                                            />
                                        </motion.div>
                                    ))
                                ]
                            )}
                        </AnimatePresence>
                    </Carousel>
                </div>

                {shouldShowTemplate && (
                    <Templates
                        templateProjects={templateProjects}
                        searchQuery={debouncedSearchQuery}
                        onTemplateClick={handleTemplateClick}
                        onToggleStar={handleToggleStar}
                        starredTemplates={starredTemplateIds}
                    />
                )}

                <div>
                    <div className="mb-[12px] flex items-center justify-between">
                        <h2 className="text-foreground text-2xl font-normal">Projects</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() =>
                                    setLayoutMode((m) => (m === 'masonry' ? 'grid' : 'masonry'))
                                }
                                className="hover:bg-secondary text-foreground-tertiary hover:text-foreground rounded p-2 transition-colors"
                                aria-label="Toggle layout"
                            >
                                {layoutMode === 'masonry' ? (
                                    <Icons.LayoutWindow className="h-5 w-5" />
                                ) : (
                                    <Icons.LayoutMasonry className="h-5 w-5" />
                                )}
                            </button>

                            <div className="relative" ref={settingsDropdownRef}>
                                <button
                                    onClick={() =>
                                        setIsSettingsDropdownOpen(!isSettingsDropdownOpen)
                                    }
                                    className="hover:bg-secondary hover:text-foreground text-foreground-tertiary rounded p-2 transition-colors"
                                    aria-haspopup="menu"
                                    aria-expanded={isSettingsDropdownOpen}
                                >
                                    <Icons.Gear className="h-4 w-4" />
                                </button>

                                <AnimatePresence>
                                    {isSettingsDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                            transition={{
                                                duration: 0.18,
                                                ease: [0.25, 0.46, 0.45, 0.94],
                                            }}
                                            className="bg-background border-border absolute top-full right-0 z-50 mt-2 w-48 rounded-md border shadow-lg"
                                        >
                                            <div className="p-2">
                                                <div className="text-foreground-tertiary mb-2 px-2 text-xs font-medium">
                                                    Sort by
                                                </div>
                                                {sortOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => {
                                                            setFilesSortBy(option.value);
                                                            setIsSettingsDropdownOpen(false);
                                                        }}
                                                        className={`hover:bg-secondary w-full rounded px-2 py-1.5 text-left text-sm transition-colors ${
                                                            filesSortBy === option.value
                                                                ? 'text-foreground bg-secondary'
                                                                : 'text-foreground-secondary'
                                                        }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}

                                                <div className="border-border my-2 border-t"></div>

                                                <div className="text-foreground-tertiary mb-2 px-2 text-xs font-medium">
                                                    Order
                                                </div>
                                                {orderOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => {
                                                            setFilesOrderBy(option.value);
                                                            setIsSettingsDropdownOpen(false);
                                                        }}
                                                        className={`hover:bg-secondary w-full rounded px-2 py-1.5 text-left text-sm transition-colors ${
                                                            filesOrderBy === option.value
                                                                ? 'text-foreground bg-secondary'
                                                                : 'text-foreground-secondary'
                                                        }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {layoutMode === 'masonry' ? (
                        <MasonryLayout
                            items={filesProjects}
                            spacing={spacing}
                            renderItem={(project: Project, aspectRatio?: string) => (
                                <ProjectCardPresentation
                                    key={`files-${project.id}`}
                                    project={project}
                                    imageUrl={getImageUrl(project)}
                                    aspectRatio={aspectRatio}
                                    searchQuery={debouncedSearchQuery}
                                    HighlightText={HighlightText}
                                    onEdit={onProjectClick}
                                    onRename={onRenameProject}
                                    onClone={onCloneProject}
                                    onToggleTemplate={onToggleTemplate}
                                    onDelete={onDeleteProject}
                                    isTemplate={project.metadata.tags.includes('template')}
                                />
                            )}
                        />
                    ) : (
                        <motion.div
                            layout
                            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                        >
                            {filesProjects.map((project) => (
                                <ProjectCardPresentation
                                    key={`files-${project.id}`}
                                    project={project}
                                    imageUrl={getImageUrl(project)}
                                    aspectRatio="aspect-[4/2.6]"
                                    searchQuery={debouncedSearchQuery}
                                    HighlightText={HighlightText}
                                    onEdit={onProjectClick}
                                    onRename={onRenameProject}
                                    onClone={onCloneProject}
                                    onToggleTemplate={onToggleTemplate}
                                    onDelete={onDeleteProject}
                                    isTemplate={project.metadata.tags.includes('template')}
                                />
                            ))}
                        </motion.div>
                    )}
                </div>
            </div>

            {selectedTemplate && shouldShowTemplate && (
                <TemplateModalPresentation
                    isOpen={isTemplateModalOpen}
                    onClose={handleCloseTemplateModal}
                    title={selectedTemplate.name}
                    description={
                        selectedTemplate.metadata?.description || 'No description available'
                    }
                    image={getImageUrl(selectedTemplate)}
                    isNew={false}
                    isStarred={selectedTemplate ? starredTemplateIds.has(selectedTemplate.id) : false}
                    onToggleStar={() => selectedTemplate && handleToggleStar(selectedTemplate.id)}
                    templateProject={selectedTemplate}
                    onUnmarkTemplate={handleUnmarkTemplate}
                    onUseTemplate={() => selectedTemplate && onUseTemplate?.(selectedTemplate.id)}
                    onPreviewTemplate={() => selectedTemplate && onPreviewTemplate?.(selectedTemplate.id)}
                    onEditTemplate={() => selectedTemplate && onEditTemplate?.(selectedTemplate.id)}
                />
            )}
        </div>
    );
};
