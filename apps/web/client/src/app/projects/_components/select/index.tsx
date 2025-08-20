'use client';

import { api } from '@/trpc/react';
import { getFileUrlFromStorage } from '@/utils/supabase/client';
import { STORAGE_BUCKETS } from '@onlook/constants';
import type { Project } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { TemplateModal } from '../templates/template-modal';
import { Templates } from '../templates/templates-section';
import { HighlightText } from './highlight-text';
import { MasonryLayout } from './masonry-layout';
import { ProjectCard } from './project-card';
import { SquareProjectCard } from './square-project-card';

export const SelectProject = ({ externalSearchQuery }: { externalSearchQuery?: string } = {}) => {
    const utils = api.useUtils();
    const { data: fetchedProjects, isLoading, refetch } = api.project.list.useQuery();
    const { data: templateProjects = [] } = api.project.listTemplates.useQuery({ limit: 8 });
    const removeTagMutation = api.project.removeTag.useMutation();
    const SHOW_TEMPLATE = templateProjects.length > 0;
    const [internalQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const searchQuery = externalSearchQuery ?? internalQuery;
    const [spacing] = useState<number>(24);

    const [filesSortBy, setFilesSortBy] = useState<'Alphabetical' | 'Date created' | 'Last viewed'>(
        'Last viewed',
    );
    const [filesOrderBy, setFilesOrderBy] = useState<'Newest first' | 'Oldest first'>('Newest first');
    const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
    const settingsDropdownRef = useRef<HTMLDivElement>(null);
    const [layoutMode, setLayoutMode] = useState<'masonry' | 'grid'>('masonry');

    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [starredTemplates, setStarredTemplates] = useState<Set<string>>(
        new Set()
    );

    const handleTemplateClick = (project: Project) => {
        const updatedTemplate = {
            ...project,
            isStarred: starredTemplates.has(project.id)
        };
        setSelectedTemplate(updatedTemplate);
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
            return newStarred;
        });
        
        if (selectedTemplate && selectedTemplate.id === templateId) {
            setSelectedTemplate((prev: any) => ({
                ...prev,
                isStarred: !prev.isStarred
            }));
        }
    };

    const handleUnmarkTemplate = async () => {
        if (!selectedTemplate?.id) return;
        
        try {
            await removeTagMutation.mutateAsync({
                projectId: selectedTemplate.id,
                tag: 'template'
            });
            
            toast.success('Removed from templates');
            
            setIsTemplateModalOpen(false);
            setSelectedTemplate(null);
            
            await Promise.all([
                utils.project.list.invalidate(),
                utils.project.listTemplates.invalidate(),
            ]);
            
            refetch();
        } catch (error) {
            toast.error('Failed to update template tag');
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 100);

        return () => clearTimeout(timer);
    }, [searchQuery]);



    const baseProjects: Project[] = fetchedProjects ?? [];

    const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<Project>>>({});

    useEffect(() => {
        const handler = (ev: Event) => {
            const custom = ev as CustomEvent;
            const detail = (custom?.detail ?? {}) as Partial<Project> & { id?: string };
            const id = (detail as any).id ?? (detail as any).projectId;
            if (!id) return;
            setLocalOverrides((prev) => ({
                ...prev,
                [id]: {
                    ...prev[id],
                    ...(detail as any),

                    metadata: {
                        ...(prev[id]?.metadata as any),
                        ...(detail as any).metadata,
                    },
                },
            }));
        };
        window.addEventListener('onlook_project_updated' as any, handler as EventListener);
        window.addEventListener('onlook_project_modified' as any, handler as EventListener);
        return () => {
            window.removeEventListener('onlook_project_updated' as any, handler as EventListener);
            window.removeEventListener('onlook_project_modified' as any, handler as EventListener);
        };
    }, []);





    const projects: Project[] = useMemo(() => {
        return baseProjects.map((p) => {
            const o = localOverrides[p.id] ?? {};
            const merged = {
                ...p,
                ...o,
                metadata: {
                    ...p.metadata,
                    ...(o as any).metadata,
                },
            } as Project;
            return merged;
        });
    }, [baseProjects, localOverrides]);


    const filteredAndSortedProjects = useMemo(() => {
        let filtered = projects;
        if (debouncedSearchQuery) {
            const q = debouncedSearchQuery.toLowerCase();
            filtered = projects.filter((p) =>
                [p.name, p.metadata?.description ?? '', p.sandbox?.url ?? ''].some((s) =>
                    (s ?? '').toLowerCase().includes(q),
                ),
            );
        }
        return [...filtered].sort((a, b) => new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime());
    }, [projects, debouncedSearchQuery]);


    const filesProjects = useMemo(() => {
        let list = filteredAndSortedProjects.filter(project => !project.tags?.includes('template'));
        
        const sorted = [...list].sort((a, b) => {
            switch (filesSortBy) {
                case 'Alphabetical':
                    return a.name.localeCompare(b.name);
                case 'Date created':
                    return new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime();
                case 'Last viewed':
                default:
                    return new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime();
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
            <div className="w-screen h-screen flex flex-col items-center justify-center">
                <div className="flex flex-row items-center gap-2">
                    <Icons.LoadingSpinner className="h-6 w-6 animate-spin text-foreground-primary" />
                    <div className="text-lg text-foreground-secondary">Loading projects...</div>
                </div>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="text-xl text-foreground-secondary">No projects found</div>
                <div className="text-md text-foreground-tertiary">Create a new project to get started</div>
                <div className="flex justify-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        <Icons.ArrowLeft className="h-4 w-4" />
                        Back to home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col px-6 py-8" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
            <div className="max-w-6xl w-full mx-auto pb-12">
                <div className="mb-12">
                    <h2 className="text-2xl text-foreground font-normal mb-[12px]">
                        Recent projects
                    </h2>

                    <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none]">
                        {filteredAndSortedProjects.length === 0 ? (
                            <div className="w-full flex items-center justify-center py-8">
                                <div className="text-center">
                                    <div className="text-foreground-secondary text-base">No projects found</div>
                                    <div className="text-foreground-tertiary text-sm">Try adjusting your search terms</div>
                                </div>
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {filteredAndSortedProjects.map((project, index) => (
                                    <motion.div
                                        key={project.id}
                                        className="flex-shrink-0 w-72"
                                        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                                        animate={{
                                            opacity: 1,
                                            y: 0,
                                            filter: "blur(0px)",
                                            transition: {
                                                duration: 0.4,
                                                delay: index * 0.1,
                                                ease: [0.25, 0.46, 0.45, 0.94],
                                            },
                                        }}
                                        exit={{
                                            opacity: 0,
                                            y: -20,
                                            filter: "blur(10px)",
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
                                ))}

                                <motion.div
                                    key="create-tile"
                                    className="flex-shrink-0 w-72"
                                    initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                                    animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, delay: filteredAndSortedProjects.length * 0.1, ease: [0.25, 0.46, 0.45, 0.94] } }}
                                    exit={{ opacity: 0, y: -20, filter: "blur(10px)", transition: { duration: 0.2 } }}
                                    layout
                                >
                                    <Link href="/">
                                        <div className="relative aspect-[4/2.8] rounded-lg border border-border bg-secondary/40 hover:bg-secondary transition-colors flex items-center justify-center">
                                            <div className="flex flex-col items-center justify-center text-foreground-tertiary">
                                                <Icons.Plus className="w-7 h-7 mb-1" />
                                                <span className="text-sm">Create</span>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>
                </div>

                {SHOW_TEMPLATE && (
                    <Templates
                        searchQuery={debouncedSearchQuery}
                        onTemplateClick={handleTemplateClick}
                        onToggleStar={handleToggleStar}
                        starredTemplates={starredTemplates}
                    />
                )}

                <div>
                    <div className="flex items-center justify-between mb-[12px]">
                        <h2 className="text-2xl text-foreground font-normal">Projects</h2>
                        <div className="flex items-center gap-2">

                            <button
                                onClick={() => setLayoutMode((m) => (m === 'masonry' ? 'grid' : 'masonry'))}
                                className="p-2 rounded transition-colors hover:bg-secondary text-foreground-tertiary hover:text-foreground"
                                aria-label="Toggle layout"
                            >
                                {layoutMode === 'masonry' ? (
                                    <Icons.LayoutWindow className="w-5 h-5" />
                                ) : (
                                    <Icons.LayoutMasonry className="w-5 h-5" />
                                )}
                            </button>


                            <div className="relative" ref={settingsDropdownRef}>
                                <button
                                    onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)}
                                    className="p-2 rounded transition-colors hover:bg-secondary hover:text-foreground text-foreground-tertiary"
                                    aria-haspopup="menu"
                                    aria-expanded={isSettingsDropdownOpen}
                                >
                                    <Icons.Gear className="w-4 h-4" />
                                </button>

                                <AnimatePresence>
                                    {isSettingsDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                                            className="absolute right-0 top-full mt-2 w-48 bg-background border border-border rounded-md shadow-lg z-50"
                                        >
                                            <div className="p-2">
                                                <div className="text-xs font-medium text-foreground-tertiary mb-2 px-2">Sort by</div>
                                                {sortOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => {
                                                            setFilesSortBy(option.value);
                                                            setIsSettingsDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary transition-colors ${filesSortBy === option.value ? 'text-foreground bg-secondary' : 'text-foreground-secondary'
                                                            }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}

                                                <div className="border-t border-border my-2"></div>

                                                <div className="text-xs font-medium text-foreground-tertiary mb-2 px-2">Order</div>
                                                {orderOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => {
                                                            setFilesOrderBy(option.value);
                                                            setIsSettingsDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary transition-colors ${filesOrderBy === option.value ? 'text-foreground bg-secondary' : 'text-foreground-secondary'
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
                        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

            {
                selectedTemplate && SHOW_TEMPLATE && (
                    <TemplateModal
                        isOpen={isTemplateModalOpen}
                        onClose={handleCloseTemplateModal}
                        title={selectedTemplate.name}
                        description={selectedTemplate.metadata?.description || 'No description available'}
                        image={
                            selectedTemplate.metadata?.previewImg?.url ||
                            (selectedTemplate.metadata?.previewImg?.storagePath 
                                ? getFileUrlFromStorage(
                                    selectedTemplate.metadata.previewImg.storagePath.bucket || STORAGE_BUCKETS.PREVIEW_IMAGES,
                                    selectedTemplate.metadata.previewImg.storagePath.path
                                )
                                : undefined)
                        }
                        isNew={false}
                        isStarred={selectedTemplate.isStarred}
                        onToggleStar={() => handleToggleStar(selectedTemplate.id)}
                        projectId={selectedTemplate.id}
                        onUnmarkTemplate={handleUnmarkTemplate}
                    />
                )
            }
        </div >
    );
};
