'use client';

import { getFileUrlFromStorage } from '@/utils/supabase/client';
import { STORAGE_BUCKETS } from '@onlook/constants';
import type { Project } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { Carousel } from '../carousel';
import { TemplateCard } from './template-card';

interface TemplatesProps {
    searchQuery: string;
    onTemplateClick: (template: Project) => void;
    onToggleStar: (templateId: string) => void;
    starredTemplates?: Set<string>;
    templateProjects: Project[];
}

export function Templates({ templateProjects, searchQuery, onTemplateClick, onToggleStar, starredTemplates = new Set() }: TemplatesProps) {
    const filteredTemplatesData = useMemo(() => {
        const filtered = templateProjects.filter(
            (project) =>
                project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (project.metadata.description && project.metadata.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
            <h2 className="text-2xl text-foreground font-normal mb-[12px]">
                Templates
            </h2>

            <Carousel gap="gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredTemplatesData.length > 0 ? (
                        filteredTemplatesData.map((project, index) => (
                            <motion.div
                                key={project.id}
                                className="flex-shrink-0"
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
                                <TemplateCard
                                    title={project.name}
                                    description={project.metadata.description || 'No description available'}
                                    image={
                                        project.metadata.previewImg?.url ||
                                        (project.metadata.previewImg?.storagePath
                                            ? getFileUrlFromStorage(
                                                project.metadata.previewImg.storagePath.bucket || STORAGE_BUCKETS.PREVIEW_IMAGES,
                                                project.metadata.previewImg.storagePath.path
                                            ) || undefined
                                            : undefined)
                                    }
                                    isNew={false}
                                    isStarred={starredTemplates.has(project.id)}
                                    onToggleStar={() => onToggleStar(project.id)}
                                    onClick={() => onTemplateClick(project)}
                                />
                            </motion.div>
                        ))
                    ) : searchQuery ? (
                        <motion.div
                            className="flex flex-col items-center justify-center w-full py-12 text-center"
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
                    ) : null}
                </AnimatePresence>
            </Carousel>
        </div>
    );
}