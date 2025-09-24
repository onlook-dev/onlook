'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';

import type { Project } from '@onlook/models';
import { STORAGE_BUCKETS } from '@onlook/constants';
import { Icons } from '@onlook/ui/icons';

import { getFileUrlFromStorage } from '@/utils/supabase/client';
import { TemplateCard } from './template-card';

interface TemplatesProps {
    searchQuery: string;
    onTemplateClick: (template: Project) => void;
    onToggleStar: (templateId: string) => void;
    starredTemplates?: Set<string>;
    templateProjects: Project[];
}

export function Templates({
    templateProjects,
    searchQuery,
    onTemplateClick,
    onToggleStar,
    starredTemplates = new Set(),
}: TemplatesProps) {
    const filteredTemplatesData = useMemo(() => {
        const filtered = templateProjects.filter(
            (project) =>
                project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (project.metadata.description &&
                    project.metadata.description.toLowerCase().includes(searchQuery.toLowerCase())),
        );

        const sorted = filtered.sort((a, b) => {
            const aIsStarred = starredTemplates.has(a.id);
            const bIsStarred = starredTemplates.has(b.id);
            if (aIsStarred && !bIsStarred) return -1;
            if (!aIsStarred && bIsStarred) return 1;
            return 0;
        });

        return sorted.slice(0, 8);
    }, [searchQuery, starredTemplates, templateProjects]);

    return (
        <div className="mb-12">
            <h2 className="text-foreground mb-[12px] text-2xl font-normal">Templates</h2>

            <div
                className="flex min-h-[120px] gap-6 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none]"
                role="region"
                aria-label="Template gallery"
            >
                <AnimatePresence mode="popLayout">
                    {filteredTemplatesData.length > 0 ? (
                        [
                            ...filteredTemplatesData.map((project, index) => (
                                <motion.div
                                    key={project.id}
                                    className="flex-shrink-0"
                                    initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        filter: 'blur(0px)',
                                        transition: {
                                            duration: 0.4,
                                            delay: index * 0.1,
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
                                    <TemplateCard
                                        title={project.name}
                                        description={
                                            project.metadata.description ||
                                            'No description available'
                                        }
                                        image={
                                            project.metadata.previewImg?.url ||
                                            (project.metadata.previewImg?.storagePath
                                                ? getFileUrlFromStorage(
                                                      project.metadata.previewImg.storagePath
                                                          .bucket || STORAGE_BUCKETS.PREVIEW_IMAGES,
                                                      project.metadata.previewImg.storagePath.path,
                                                  ) || undefined
                                                : undefined)
                                        }
                                        isNew={false}
                                        isStarred={starredTemplates.has(project.id)}
                                        onToggleStar={() => onToggleStar(project.id)}
                                        onClick={() => onTemplateClick(project)}
                                    />
                                </motion.div>
                            )),

                            ...(!searchQuery ? [<AddTemplateButton />] : []),
                        ]
                    ) : searchQuery ? (
                        <motion.div
                            className="flex w-full flex-col items-center justify-center py-12 text-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="text-foreground-secondary mb-2 text-lg">
                                No templates found
                            </div>
                            <div className="text-foreground-tertiary text-sm">
                                Try adjusting your search terms
                            </div>
                        </motion.div>
                    ) : (
                        <AddTemplateButton />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

const AddTemplateButton = () => {
    // Hide for now since it doesn't do anything yet
    return null;
    return (
        <motion.div
            className="flex-shrink-0"
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
            <Link href="/">
                <div className="bg-background border-border hover:border-border/80 hover:bg-secondary group relative flex h-24 w-80 items-center justify-center overflow-hidden rounded-xl border transition-all duration-200">
                    <div className="from-secondary to-secondary/80 absolute inset-0 bg-gradient-to-br opacity-50" />
                    <div className="relative z-10 flex flex-col items-center">
                        <Icons.Plus className="text-foreground-tertiary group-hover:text-foreground-secondary h-6 w-6 transition-colors" />
                        <span className="text-foreground-tertiary group-hover:text-foreground-secondary mt-1 text-xs">
                            Add Template
                        </span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
};
