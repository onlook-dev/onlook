'use client';

import type { Project } from '@onlook/models';
import { timeAgo } from '@onlook/utility';
import { useMemo } from 'react';

interface SquareProjectCardPresentationProps {
    project: Project;
    /** Resolved image URL (should be pre-resolved, not storage path) */
    imageUrl?: string | null;
    searchQuery?: string;
    HighlightText?: React.ComponentType<{ text: string; searchQuery: string }>;
    /** Callback when card is clicked */
    onClick?: (project: Project) => void;
}

/**
 * SquareProjectCardPresentation - Pure presentational version of SquareProjectCard.
 * Takes all data as props, including pre-resolved image URLs.
 */
export function SquareProjectCardPresentation({
    project,
    imageUrl,
    searchQuery = "",
    HighlightText,
    onClick,
}: SquareProjectCardPresentationProps) {
    const lastUpdated = useMemo(() => timeAgo(project.metadata.updatedAt), [project.metadata.updatedAt]);

    const handleClick = () => {
        onClick?.(project);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    return (
        <div
            className="cursor-pointer transition-all duration-300 group"
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
        >
            <div className={`w-full aspect-[4/2.8] rounded-lg overflow-hidden relative shadow-sm transition-all duration-300`}>
                {imageUrl ? (
                    <img src={imageUrl} alt={project.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                ) : (
                    <>
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-gray-800/40 via-gray-500/40 to-gray-400/40" />
                        <div className="absolute inset-0 rounded-lg border-[0.5px] border-gray-500/70" style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' }} />
                    </>
                )}

                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

                {onClick && (
                    <div className="absolute inset-0 bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-30">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClick();
                            }}
                            className="gap-2 border border-gray-300 w-auto cursor-pointer bg-white text-black hover:bg-gray-100 px-4 py-2 rounded"
                        >
                            ✏️ Edit
                        </button>
                    </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-3 z-10 group-hover:opacity-50 transition-opacity duration-300">
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
                </div>
            </div>
        </div>
    );
}
