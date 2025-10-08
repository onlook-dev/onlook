'use client';

import { useEditorEngine } from '@/components/store/editor';
import type { ImageMessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { observer } from 'mobx-react-lite';
import { AnimatePresence } from 'motion/react';
import { DraftImagePill } from '../context-pills/draft-image-pill';

export const AttachedImages = observer(() => {
    const editorEngine = useEditorEngine();

    const handleRemoveImage = (imageToRemove: ImageMessageContext) => {
        const newImageContext = editorEngine.chat.context.imageContext.filter(
            (image) => image !== imageToRemove,
        );
        editorEngine.chat.context.imageContext = newImageContext;
    };

    const images = editorEngine.chat.context.imageContext;

    if (images.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1.5 px-1 pt-1 pb-2 mb-2 bg-background-secondary/50 rounded-md">
            <div className="flex flex-row items-center gap-1.5 text-xs text-foreground-tertiary pt-1 px-1">
                <span>Attached Images</span>
            </div>
            <div className="flex flex-row flex-wrap items-center gap-1.5 px-1">
                <AnimatePresence mode="popLayout">
                    {images.map((image: ImageMessageContext, index: number) => {
                        if (image.type !== MessageContextType.IMAGE) {
                            return null;
                        }
                        return (
                            <DraftImagePill
                                key={`image-${image.id ?? image.content}-${index}`}
                                context={image}
                                onRemove={() => handleRemoveImage(image)}
                            />
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
});
