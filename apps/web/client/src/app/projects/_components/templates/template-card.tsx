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
    title = "Template Name",
    description = "A brief description of what this template includes and its use case.",
    image = "/assets/site-version-1.png",
    isNew = false,
    isStarred = false,
    onToggleStar,
    onClick
}: TemplateCardProps) {
    const handleClick = () => {
        if (onClick) {
            onClick();
        }
    };

    return (
        <div
            className="cursor-pointer transition-all duration-300 hover:opacity-80 group block text-left flex-shrink-0"
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
            <div className="w-80 h-24 rounded-xl overflow-hidden hover:bg-secondary transition-colors duration-300 bg-background border border-border hover:border-border/80 flex relative">
                <div className="w-1/3 h-full flex-shrink-0 relative">
                    {image && image !== "/assets/site-version-1.png" ? (
                        <img
                            src={image}
                            alt={`${title} template preview`}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-t from-gray-800/40 via-gray-500/40 to-gray-400/40" />
                    )}

                    {isNew && (
                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium z-10">
                            New
                        </div>
                    )}
                </div>

                <div className="flex-1 p-3 flex flex-col justify-start">
                    <div className="flex items-start mb-1 w-full gap-2">
                        <h3 className="text-foreground font-semibold text-sm line-clamp-1 flex-1 leading-tight">
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
                                        className="p-1 rounded-full hover:bg-secondary transition-colors flex-shrink-0 mt-[-2px]"
                                        aria-label={isStarred ? "Remove from favorites" : "Add to favorites"}
                                    >
{isStarred ? (
                                            <Icons.BookmarkFilled
                                                className="w-3.5 h-3.5 text-white"
                                            />
                                        ) : (
                                            <Icons.Bookmark
                                                className="w-3.5 h-3.5 text-foreground-tertiary hover:text-foreground"
                                            />
                                        )}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Mark as favorite</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>

                    <p className="text-foreground-tertiary text-xs line-clamp-2 leading-tight">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}