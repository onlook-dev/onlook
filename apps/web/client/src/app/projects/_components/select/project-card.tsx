'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';

import type { Project } from '@onlook/models';
import { STORAGE_BUCKETS } from '@onlook/constants';
import { timeAgo } from '@onlook/utility';

import { getFileUrlFromStorage } from '@/utils/supabase/client';
import { EditAppButton } from '../edit-app';
import { SettingsDropdown } from '../settings';

export function ProjectCard({
    project,
    refetch,
    aspectRatio = 'aspect-[4/2.6]',
    searchQuery = '',
    HighlightText,
}: {
    project: Project;
    refetch: () => void;
    aspectRatio?: string;
    searchQuery?: string;
    HighlightText?: React.ComponentType<{ text: string; searchQuery: string }>;
}) {
    const [img, setImg] = useState<string | null>(null);
    const SHOW_DESCRIPTION = false;

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

    const lastUpdated = useMemo(
        () => timeAgo(project.metadata.updatedAt),
        [project.metadata.updatedAt],
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="w-full cursor-pointer break-inside-avoid"
        >
            <div
                className={`relative ${aspectRatio} group overflow-hidden rounded-lg shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-black/20`}
            >
                {img ? (
                    <img
                        src={img}
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
                    <SettingsDropdown project={project} refetch={refetch} />
                </div>

                <div className="bg-background/30 pointer-events-none absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                    <EditAppButton project={project} />
                </div>

                <div
                    className="from-background via-background/20 group-hover:from-background group-hover:via-background/40 absolute right-0 bottom-0 left-0 h-32 bg-gradient-to-t to-transparent p-4 transition-all duration-300"
                    style={{ bottom: '-1px', left: '-1px', right: '-1px' }}
                >
                    <div className="flex h-full items-end justify-between">
                        <div>
                            <div className="mb-1 truncate text-base font-medium text-white drop-shadow-lg">
                                {HighlightText ? (
                                    <HighlightText text={project.name} searchQuery={searchQuery} />
                                ) : (
                                    project.name
                                )}
                            </div>
                            <div className="mb-1 flex items-center text-xs text-white/70 drop-shadow-lg">
                                <span>{lastUpdated} ago</span>
                            </div>
                            {SHOW_DESCRIPTION && project.metadata?.description && (
                                <div className="line-clamp-1 text-xs text-white/60 drop-shadow-lg">
                                    {HighlightText ? (
                                        <HighlightText
                                            text={project.metadata.description}
                                            searchQuery={searchQuery}
                                        />
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
