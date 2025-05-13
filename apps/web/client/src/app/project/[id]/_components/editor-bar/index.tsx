'use client';

import { useEditorEngine } from '@/components/store/editor';
import { EditorMode, type DomElement } from '@onlook/models';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { DivSelected } from './div-selected';
import { ImgSelected } from './img-selected';
import { TextSelected } from './text-selected';

const TAG_TYPES: Record<string, string[]> = {
    text: ['h1', 'h2'],
    div: ['div'],
    image: ['img'],
    video: ['video'],
} as const;

const getSelectedTag = (selected: DomElement[]): 'div' | 'text' | 'image' | 'video' => {
    if (selected.length === 0) {
        return 'div';
    }
    const tag = selected[0]?.tagName;
    if (!tag) {
        return 'div';
    }
    for (const [key, value] of Object.entries(TAG_TYPES)) {
        if (value.includes(tag.toLowerCase())) {
            return key as 'div' | 'text' | 'image' | 'video';
        }
    }
    return 'div';
};

export const EditorBar = observer(() => {
    const editorEngine = useEditorEngine();
    const selectedTag = getSelectedTag(editorEngine.elements.selected);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
                "flex flex-col border-[0.5px] border-border p-1 px-1.5 bg-background rounded-xl backdrop-blur drop-shadow-xl z-50",
                editorEngine.state.editorMode === EditorMode.PREVIEW && "hidden"
            )}
            transition={{
                type: 'spring',
                bounce: 0.1,
                duration: 0.4,
                stiffness: 200,
                damping: 25,
            }}
        >
            {selectedTag === 'text' && <TextSelected />}
            {selectedTag === 'div' && <DivSelected />}
            {selectedTag === 'image' && <ImgSelected />}
        </motion.div>
    );
});
