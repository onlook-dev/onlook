'use client';

import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { useEffect, useState } from 'react';

type ObjectFitValue = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';

export const ImgFit = () => {
    const editorEngine = useEditorEngine();
    const [objectFit, setObjectFit] = useState<ObjectFitValue>(
        (editorEngine.style.selectedStyle?.styles.computed.objectFit as ObjectFitValue) ?? 'fill',
    );

    useEffect(() => {
        setObjectFit(
            (editorEngine.style.selectedStyle?.styles.computed.objectFit as ObjectFitValue) ??
            'fill',
        );
    }, [editorEngine.style.selectedStyle?.styles.computed.objectFit]);

    const handleFitChange = (newFit: ObjectFitValue) => {
        setObjectFit(newFit);
        editorEngine.style.update('objectFit', newFit);
    };

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                >
                    <Icons.Image className="h-4 w-4 min-h-4 min-w-4" />
                    <span className="text-sm">
                        {objectFit === 'cover'
                            ? 'Cover'
                            : objectFit === 'contain'
                                ? 'Contain'
                                : 'Fill'}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[120px] mt-2 p-1 rounded-lg">
                <div className="p-2 space-y-2">
                    <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Type</span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => handleFitChange('cover')}
                                className={`flex-1 text-sm px-3 py-1 rounded-md ${objectFit === 'cover'
                                        ? 'bg-background-tertiary/20 text-white'
                                        : 'text-muted-foreground hover:bg-background-tertiary/10'
                                    }`}
                            >
                                Cover
                            </button>
                            <button
                                onClick={() => handleFitChange('contain')}
                                className={`flex-1 text-sm px-3 py-1 rounded-md ${objectFit === 'contain'
                                        ? 'bg-background-tertiary/20 text-white'
                                        : 'text-muted-foreground hover:bg-background-tertiary/10'
                                    }`}
                            >
                                Contain
                            </button>
                            <button
                                onClick={() => handleFitChange('fill')}
                                className={`flex-1 text-sm px-3 py-1 rounded-md ${objectFit === 'fill'
                                        ? 'bg-background-tertiary/20 text-white'
                                        : 'text-muted-foreground hover:bg-background-tertiary/10'
                                    }`}
                            >
                                Fill
                            </button>
                        </div>
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
