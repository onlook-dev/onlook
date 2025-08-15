'use client';

import { getFileUrlFromStorage } from '@/utils/supabase/client';
import { STORAGE_BUCKETS } from '@onlook/constants';
import type { Project } from '@onlook/models';
import { timeAgo } from '@onlook/utility';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { EditAppButton } from '../edit-app';
import { Settings } from '../settings';

export function ProjectCard({
    project,
    refetch,
    aspectRatio = "aspect-[4/2.6]",
    searchQuery = "",
    HighlightText
}: {
    project: Project;
    refetch: () => void;
    aspectRatio?: string;
    searchQuery?: string;
    HighlightText?: React.ComponentType<{ text: string; searchQuery: string }>;
}) {
    const [img, setImg] = useState<string | null>(null);
    const router = useRouter();
    const showDescription = false;

    const handleCardClick = () => {
        router.push(`/project/${project.id}`);
    };

    useEffect(() => {
        let isMounted = true;
        const preview = project.metadata?.previewImg;
        if (!preview) return;
        if (preview.type === 'url' && preview.url) {
            if (isMounted) setImg(preview.url);
        } else {
            const path = preview.storagePath?.path ?? '';
            if (!path) return;
            const bucket = preview.storagePath?.bucket ?? STORAGE_BUCKETS.PREVIEW_IMAGES;
            const url = getFileUrlFromStorage(bucket, path);
            if (isMounted) setImg(url ?? null);
        }
        return () => {
            isMounted = false;
        };
    }, [project.metadata?.previewImg]);

    const lastUpdated = useMemo(() => timeAgo(new Date(project.metadata.updatedAt).toISOString()), [project.metadata.updatedAt]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="w-full break-inside-avoid cursor-pointer"
            onClick={handleCardClick}
        >
            <div className={`relative ${aspectRatio} rounded-lg overflow-hidden shadow-sm hover:shadow-xl hover:shadow-black/20 transition-all duration-300 group`}>
                {img ? (
                    <img src={img} alt={project.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                ) : (
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20" />
                )}

                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                    <Settings project={project} refetch={refetch} />
                </div>

                <div className="absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 hover:opacity-100 transition-opacity">
                    <EditAppButton
                        project={project}
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    />
                </div>

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
                            {showDescription && project.metadata?.description && (
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
