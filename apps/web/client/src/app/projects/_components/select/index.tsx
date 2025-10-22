'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Carousel } from '../carousel';
import localforage from 'localforage';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';

import type { Project } from '@onlook/models';
import { STORAGE_BUCKETS, Tags } from '@onlook/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

import { api } from '@/trpc/react';
import { useCreateBlankProject } from '@/hooks/use-create-blank-project';
import { getFileUrlFromStorage } from '@/utils/supabase/client';
import { Templates } from '../templates';
import { TemplateModal } from '../templates/template-modal';
import { HighlightText } from './highlight-text';
import { MasonryLayout } from './masonry-layout';
import { ProjectCard } from './project-card';
import { SquareProjectCard } from './square-project-card';

const STARRED_TEMPLATES_KEY = 'onlook_starred_templates';

export const SelectProject = ({ externalSearchQuery }: { externalSearchQuery?: string } = {}) => {
    // Hooks
    const utils = api.useUtils();
    const { data: user } = api.user.get.useQuery();
    const { data: fetchedProjects, isLoading, refetch } = api.project.list.useQuery();
    const { mutateAsync: removeTag } = api.project.removeTag.useMutation();
    const { handleStartBlankProject, isCreatingProject } = useCreateBlankProject();

    // Search and filters
    const [internalQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const searchQuery = externalSearchQuery ?? internalQuery;
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
    const projects =
        fetchedProjects?.filter((project) => !project.metadata.tags.includes(Tags.TEMPLATE)) ?? [];
    const templateProjects =
        fetchedProjects?.filter((project) => project.metadata.tags.includes(Tags.TEMPLATE)) ?? [];
    const shouldShowTemplate = templateProjects.length > 0;
    const [selectedTemplate, setSelectedTemplate] = useState<Project | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [starredTemplates, setStarredTemplates] = useState<Set<string>>(new Set());

    // Load starred templates from storage
    const loadStarredTemplates = async () => {
        try {
            const saved = await localforage.getItem<string[]>(STARRED_TEMPLATES_KEY);
            if (saved && Array.isArray(saved)) {
                setStarredTemplates(new Set(saved));
            }
        } catch (error) {
            console.error('Failed to load starred templates:', error);
        }
    };

    // Save starred templates to storage
    const saveStarredTemplates = async (templateIds: Set<string>) => {
        try {
            await localforage.setItem(STARRED_TEMPLATES_KEY, Array.from(templateIds));
        } catch (error) {
            console.error('Failed to save starred templates:', error);
        }
    };

    const handleTemplateClick = (project: Project) => {
        setSelectedTemplate(project);
        setIsTemplateModalOpen(true);
    };

    const handleCloseTemplateModal = () => {
        setIsTemplateModalOpen(false);
        setSelectedTemplate(null);
    };

    const handleToggleStar = (templateId: string) => {
        setStarredTemplates((prev) => {
            const newStarred = new Set(prev);
            if (newStarred.has(templateId)) {
                newStarred.delete(templateId);
            } else {
                newStarred.add(templateId);
            }
            // Save to storage asynchronously
            saveStarredTemplates(newStarred);
            return newStarred;
        });

        // Note: Selected template star state is handled by the starredTemplates Set
    };

    const handleUnmarkTemplate = async () => {
        if (!selectedTemplate?.id) return;

        try {
            await removeTag({
                projectId: selectedTemplate.id,
                tag: Tags.TEMPLATE,
            });

            toast.success('Removed from templates');

            setIsTemplateModalOpen(false);
            setSelectedTemplate(null);

            await Promise.all([utils.project.list.invalidate()]);

            refetch();
        } catch (error) {
            toast.error('Failed to update template tag');
        }
    };

    // Initialize starred templates from storage
    useEffect(() => {
        loadStarredTemplates();
    }, []);

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

    if (projects.length === 0) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                <div className="text-foreground-secondary text-xl">No projects found</div>
                <div className="text-md text-foreground-tertiary">
                    Create a new project to get started
                </div>
                <div className="flex justify-center">
                    <Button
                        onClick={handleStartBlankProject}
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
                                            onClick={handleStartBlankProject}
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
                                            <SquareProjectCard
                                                project={project}
                                                searchQuery={debouncedSearchQuery}
                                                HighlightText={HighlightText}
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
                        starredTemplates={starredTemplates}
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
                                <ProjectCard
                                    key={`files-${project.id}`}
                                    project={project}
                                    refetch={refetch}
                                    aspectRatio={aspectRatio}
                                    searchQuery={debouncedSearchQuery}
                                    HighlightText={HighlightText}
                                />
                            )}
                        />
                    ) : (
                        <motion.div
                            layout
                            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                        >
                            {filesProjects.map((project) => (
                                <ProjectCard
                                    key={`files-${project.id}`}
                                    project={project}
                                    refetch={refetch}
                                    aspectRatio="aspect-[4/2.6]"
                                    searchQuery={debouncedSearchQuery}
                                    HighlightText={HighlightText}
                                />
                            ))}
                        </motion.div>
                    )}
                </div>
            </div>

            {selectedTemplate && shouldShowTemplate && (
                <TemplateModal
                    isOpen={isTemplateModalOpen}
                    onClose={handleCloseTemplateModal}
                    title={selectedTemplate.name}
                    description={
                        selectedTemplate.metadata?.description || 'No description available'
                    }
                    image={
                        selectedTemplate.metadata?.previewImg?.url ||
                        (selectedTemplate.metadata?.previewImg?.storagePath?.bucket &&
                        selectedTemplate.metadata.previewImg.storagePath.path
                            ? getFileUrlFromStorage(
                                  selectedTemplate.metadata.previewImg.storagePath.bucket,
                                  selectedTemplate.metadata.previewImg.storagePath.path,
                              )
                            : selectedTemplate.metadata?.previewImg?.storagePath?.path
                              ? getFileUrlFromStorage(
                                    STORAGE_BUCKETS.PREVIEW_IMAGES,
                                    selectedTemplate.metadata.previewImg.storagePath.path,
                                )
                              : null)
                    }
                    isNew={false}
                    isStarred={selectedTemplate ? starredTemplates.has(selectedTemplate.id) : false}
                    onToggleStar={() => selectedTemplate && handleToggleStar(selectedTemplate.id)}
                    templateProject={selectedTemplate}
                    onUnmarkTemplate={handleUnmarkTemplate}
                    user={user}
                />
            )}
        </div>
    );
};
