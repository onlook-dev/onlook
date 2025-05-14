'use client';

import { Icons } from '@onlook/ui/icons';

type StagingToggleProps = {
    selectedElement: string;
    onElementSelect: (element: string) => void;
};

export const StagingToggle = ({ selectedElement, onElementSelect }: StagingToggleProps) => {
    return (
        <div className="flex items-center justify-center gap-1">
            <button
                onClick={() => onElementSelect('div')}
                className={`flex items-center justify-center px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedElement === 'div'
                        ? 'bg-background-tertiary/20 border border-border text-white'
                        : 'text-muted-foreground border border-border/0 hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border'
                }`}
            >
                <span>div</span>
                {selectedElement === 'div' && <Icons.Check className="h-4 w-4 ml-2" />}
            </button>
            <button
                onClick={() => onElementSelect('text')}
                className={`flex items-center justify-center px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedElement === 'text'
                        ? 'bg-background-tertiary/20 border border-border text-white'
                        : 'text-muted-foreground border border-border/0 hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border'
                }`}
            >
                <span>text</span>
                {selectedElement === 'text' && <Icons.Check className="h-4 w-4 ml-2" />}
            </button>
            <button
                onClick={() => onElementSelect('image')}
                className={`flex items-center justify-center px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedElement === 'image'
                        ? 'bg-background-tertiary/20 border border-border text-white'
                        : 'text-muted-foreground border border-border/0 hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border'
                }`}
            >
                <span>image</span>
                {selectedElement === 'image' && <Icons.Check className="h-4 w-4 ml-2" />}
            </button>
        </div>
    );
};
