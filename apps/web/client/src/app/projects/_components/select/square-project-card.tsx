'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Project } from '@onlook/models';
import { STORAGE_BUCKETS } from '@onlook/constants';
import { timeAgo } from '@onlook/utility';

import { getFileUrlFromStorage } from '@/utils/supabase/client';
import { EditAppButton } from '../edit-app';

export function SquareProjectCard({
    project,
    searchQuery = '',
    HighlightText,
}: {
    project: Project;
    searchQuery?: string;
    HighlightText?: React.ComponentType<{ text: string; searchQuery: string }>;
}) {
    const [img, setImg] = useState<string | null>(null);
    const router = useRouter();

    const handleClick = () => {
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

    const lastUpdated = useMemo(
        () => timeAgo(project.metadata.updatedAt),
        [project.metadata.updatedAt],
    );

    return (
        <div
            className="group cursor-pointer transition-all duration-300"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
        >
            <div
                className={`relative aspect-[4/2.8] w-full overflow-hidden rounded-lg shadow-sm transition-all duration-300`}
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

                <div className="bg-background/30 absolute inset-0 z-30 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <EditAppButton
                        project={project}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClick();
                        }}
                    />
                </div>

                <div className="absolute right-0 bottom-0 left-0 z-10 p-3 transition-opacity duration-300 group-hover:opacity-50">
                    <div className="mb-1 truncate text-sm font-medium text-white drop-shadow-lg">
                        {HighlightText ? (
                            <HighlightText text={project.name} searchQuery={searchQuery} />
                        ) : (
                            project.name
                        )}
                    </div>
                    <div className="mb-1 flex items-center text-xs text-white/70 drop-shadow-lg">
                        <span>{lastUpdated} ago</span>
                    </div>
                    {/* {project.metadata?.description && (
                        <div className="text-white/70 text-xs line-clamp-1 drop-shadow-lg">
                            {HighlightText ? (
                                <HighlightText text={project.metadata.description} searchQuery={searchQuery} />
                            ) : (
                                project.metadata.description
                            )}
                        </div>
                    )} */}
                </div>
            </div>
        </div>
    );
}
