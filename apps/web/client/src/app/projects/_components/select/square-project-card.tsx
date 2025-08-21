'use client';

import { getFileUrlFromStorage } from '@/utils/supabase/client';
import { STORAGE_BUCKETS } from '@onlook/constants';
import type { Project } from '@onlook/models';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { EditAppButton } from '../edit-app';
import { timeAgo } from '@onlook/utility';

export function SquareProjectCard({
    project,
    searchQuery = "",
    HighlightText
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

    const lastUpdated = useMemo(() => timeAgo(new Date(project.metadata.updatedAt).toISOString()), [project.metadata.updatedAt]);

    return (
        <div
            className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-black/20 group"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
        >
            <div className={`w-full aspect-[4/2.8] rounded-lg overflow-hidden relative shadow-sm transition-all duration-300`}>
                {img ? (
                    <img src={img} alt={project.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                ) : (
                    <>
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-gray-800/40 via-gray-500/40 to-gray-400/40" />
                        <div className="absolute inset-0 rounded-lg border-[0.5px] border-gray-500/70" style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' }} />
                    </>
                )}

                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

                <div className="absolute inset-0 bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <EditAppButton
                        project={project}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClick();
                        }}
                    />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="text-white font-medium text-sm mb-1 truncate drop-shadow-lg">
                        {HighlightText ? (
                            <HighlightText text={project.name} searchQuery={searchQuery} />
                        ) : (
                            project.name
                        )}
                    </div>
                    <div className="text-white/70 text-xs mb-1 drop-shadow-lg flex items-center">
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
