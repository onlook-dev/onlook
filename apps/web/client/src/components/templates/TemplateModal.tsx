'use client';

import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@onlook/ui/dialog';
import { Button } from '@onlook/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  category: string;
  image: string;
  isNew?: boolean;
  isStarred?: boolean;
  onToggleStar?: () => void;
}

export default function TemplateModal({
  isOpen,
  onClose,
  title,
  description,
  category,
  image,
  isNew = false,
  isStarred = false,
  onToggleStar
}: TemplateModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full h-[600px] p-0">
        <div className="flex h-full">
          <div className="w-1/2 bg-secondary relative">
            <img
              src={image}
              alt={`${title} template preview`}
              className="w-full h-full object-cover"
            />
            {isNew && (
              <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                New
              </div>
            )}
          </div>

          <div className="w-1/2 p-6 flex flex-col">
            <DialogHeader className="space-y-3 mb-6">
              <DialogTitle className="text-2xl font-semibold text-left">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-foreground-tertiary text-left">
                {category}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 mb-6">
              <p className="text-foreground-secondary text-base leading-relaxed">
                {description}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button className="flex-1" size="lg">
                  Use Template
                </Button>
                
                {onToggleStar && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={onToggleStar}
                    aria-label={isStarred ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Icons.Bookmark
                      className={`w-5 h-5 ${isStarred ? "text-yellow-400 fill-yellow-400" : "text-foreground-tertiary"}`}
                    />
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="lg" aria-label="Template options">
                      <Icons.DotsHorizontal className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>
                      <Icons.EyeOpen className="w-4 h-4 mr-3" />
                      Preview Template
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Icons.Share className="w-4 h-4 mr-3" />
                      Share Template
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Icons.Download className="w-4 h-4 mr-3" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-400 focus:text-red-300">
                      Report Template
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-foreground-tertiary">
                  Used 24 times • Created 24 days ago
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}