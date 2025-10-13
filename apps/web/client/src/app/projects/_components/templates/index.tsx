'use client';

import { getFileUrlFromStorage } from '@/utils/supabase/client';
import { STORAGE_BUCKETS } from '@onlook/constants';
import type { Project } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TemplateCard } from './template-card';

interface TemplatesProps {
    searchQuery: string;
    onTemplateClick: (template: Project) => void;
    onToggleStar: (templateId: string) => void;
    starredTemplates?: Set<string>;
    templateProjects: Project[];
}

export function Templates({ templateProjects, searchQuery, onTemplateClick, onToggleStar, starredTemplates = new Set() }: TemplatesProps) {
    // Templates scroll state
    const templatesScrollRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [showLeftScrollButton, setShowLeftScrollButton] = useState(false);

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

    // Check if templates section has overflow
    useEffect(() => {
        const checkOverflow = () => {
            if (templatesScrollRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = templatesScrollRef.current;
                const hasOverflow = scrollWidth > clientWidth;
                const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 10;
                setShowScrollButton(hasOverflow && !isAtEnd);
            }
        };

        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        
        return () => window.removeEventListener('resize', checkOverflow);
    }, [filteredTemplatesData]);

    // Handle scroll position for left and right button visibility
    useEffect(() => {
        const handleScroll = () => {
            if (templatesScrollRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = templatesScrollRef.current;
                
                // Show left button if scrolled away from the left edge
                setShowLeftScrollButton(scrollLeft > 10);
                
                // Hide right button if scrolled to the end (with small tolerance)
                const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 10;
                setShowScrollButton(!isAtEnd && scrollWidth > clientWidth);
            }
        };

        const scrollContainer = templatesScrollRef.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll);
            window.addEventListener('resize', handleScroll);
            // Also check initial scroll position
            handleScroll();
            return () => {
                scrollContainer.removeEventListener('scroll', handleScroll);
                window.removeEventListener('resize', handleScroll);
            };
        }
    }, [filteredTemplatesData]);

    // Scroll the templates section to the right
    const handleScrollTemplates = () => {
        if (templatesScrollRef.current) {
            const scrollAmount = 300;
            templatesScrollRef.current.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Scroll the templates section to the left
    const handleScrollTemplatesLeft = () => {
        if (templatesScrollRef.current) {
            const scrollAmount = 300;
            templatesScrollRef.current.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="mb-12">
            <h2 className="text-2xl text-foreground font-normal mb-[12px]">
                Templates
            </h2>

            <div className="relative overflow-x-visible">
                {/* Left gradient - only visible when scrolled */}
                <AnimatePresence>
                    {showLeftScrollButton && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none z-10"
                        />
                    )}
                </AnimatePresence>
                
                {/* Right gradient - only visible when not at end */}
                <AnimatePresence>
                    {showScrollButton && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none z-10"
                        />
                    )}
                </AnimatePresence>
                
                {/* Left floating scroll button - only visible when scrolled */}
                <AnimatePresence>
                    {showLeftScrollButton && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={handleScrollTemplatesLeft}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-secondary transition-colors flex items-center justify-center text-foreground-secondary hover:text-foreground"
                            aria-label="Scroll templates left"
                        >
                            <Icons.ChevronRight className="w-5 h-5 rotate-180" />
                        </motion.button>
                    )}
                </AnimatePresence>
                
                {/* Right floating scroll button */}
                <AnimatePresence>
                    {showScrollButton && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={handleScrollTemplates}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-lg hover:bg-secondary transition-colors flex items-center justify-center text-foreground-secondary hover:text-foreground"
                            aria-label="Scroll templates right"
                        >
                            <Icons.ChevronRight className="w-5 h-5" />
                        </motion.button>
                    )}
                </AnimatePresence>

                <div
                    ref={templatesScrollRef}
                    className="flex gap-6 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]"
                    role="region"
                    aria-label="Template gallery"
                >
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
                </div>
            </div>
        </div>
    );
}