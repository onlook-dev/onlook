'use client';

import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';

interface TemplateCardProps {
    title?: string;
    description?: string;
    image?: string;
    isNew?: boolean;
    isStarred?: boolean;
    onToggleStar?: () => void;
    onClick?: () => void;
}

export function TemplateCard({
    title = 'Template Name',
    description = 'A brief description of what this template includes and its use case.',
    image = '/assets/site-version-1.png',
    isNew = false,
    isStarred = false,
    onToggleStar,
    onClick,
}: TemplateCardProps) {
    const handleClick = () => {
        if (onClick) {
            onClick();
        }
    };

    return (
        <div
            className="group block flex-shrink-0 cursor-pointer text-left transition-all duration-300 hover:opacity-80"
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
            aria-label={`Template: ${title} - ${description}`}
        >
            <div className="hover:bg-secondary bg-background border-border hover:border-border/80 relative flex h-24 w-80 overflow-hidden rounded-xl border transition-colors duration-300">
                <div className="relative h-full w-1/3 flex-shrink-0">
                    {image && image !== '/assets/site-version-1.png' ? (
                        <img
                            src={image}
                            alt={`${title} template preview`}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="h-full w-full bg-gradient-to-t from-gray-800/40 via-gray-500/40 to-gray-400/40" />
                    )}

                    {isNew && (
                        <div className="absolute top-2 left-2 z-10 rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white">
                            New
                        </div>
                    )}
                </div>

                <div className="flex flex-1 flex-col justify-start p-3">
                    <div className="mb-1 flex w-full items-start gap-2">
                        <h3 className="text-foreground line-clamp-1 flex-1 text-sm leading-tight font-semibold">
                            {title}
                        </h3>

                        {onToggleStar && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleStar();
                                        }}
                                        className="hover:bg-secondary mt-[-2px] flex-shrink-0 rounded-full p-1 transition-colors"
                                        aria-label={
                                            isStarred ? 'Remove from favorites' : 'Add to favorites'
                                        }
                                    >
                                        {isStarred ? (
                                            <Icons.BookmarkFilled className="h-3.5 w-3.5 text-white" />
                                        ) : (
                                            <Icons.Bookmark className="text-foreground-tertiary hover:text-foreground h-3.5 w-3.5" />
                                        )}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Mark as favorite</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>

                    <p className="text-foreground-tertiary line-clamp-2 text-xs leading-tight">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}
