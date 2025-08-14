'use client';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

interface TemplateCardProps {
  title?: string;
  description?: string;
  category?: string;
  image?: string;
  isNew?: boolean;
  isStarred?: boolean;
  onToggleStar?: () => void;
  onClick?: () => void;
  starPosition?: "image" | "text";
}

export default function TemplateCard({
  title = "Template Name",
  description = "A brief description of what this template includes and its use case.",
  category = "Web",
  image = "/assets/site-version-1.png",
  isNew = false,
  isStarred = false,
  onToggleStar,
  onClick,
  starPosition = "image"
}: TemplateCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <button
      className="cursor-pointer transition-all duration-300 hover:opacity-80 group block text-left w-full"
      onClick={handleClick}
      aria-label={`Template: ${title} - ${description}`}
    >
      <div className="w-80 h-24 rounded-xl overflow-hidden hover:bg-secondary transition-colors duration-300 bg-background border border-border hover:border-border/80 flex">
        <div className="w-1/3 h-full bg-secondary flex-shrink-0 relative">
          <img
            src={image}
            alt={`${title} template preview`}
            className="w-full h-full object-cover"
          />

          {onToggleStar && starPosition === "image" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar();
              }}
              className="absolute top-2 left-2 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
              aria-label={isStarred ? "Remove from favorites" : "Add to favorites"}
            >
              <Icons.Bookmark
                className={`w-3 h-3 ${isStarred ? "text-yellow-400 fill-yellow-400" : "text-white"}`}
              />
            </Button>
          )}
        </div>

        <div className="flex-1 p-4 flex flex-col justify-start items-start">
          <div className="flex items-center mb-1 w-full gap-[2px]">
            {onToggleStar && starPosition === "text" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar();
                }}
                className="p-1 rounded-full hover:bg-secondary transition-colors flex-shrink-0"
                aria-label={isStarred ? "Remove from favorites" : "Add to favorites"}
              >
                <Icons.Bookmark
                  className={`w-4 h-4 ${isStarred ? "text-yellow-400 fill-yellow-400" : "text-foreground-tertiary hover:text-foreground"}`}
                />
              </Button>
            )}

            <h3 className="text-foreground font-medium text-sm line-clamp-1 min-h-4 flex-1">
              {title}
            </h3>
          </div>

          <p className="text-foreground-tertiary text-xs line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}