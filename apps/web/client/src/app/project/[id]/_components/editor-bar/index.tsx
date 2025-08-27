'use client';

import { useEditorEngine } from '@/components/store/editor';
import { EditorMode, type DomElement } from '@onlook/models';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { DivSelected } from './div-selected';
import { DropdownManagerProvider } from './hooks/use-dropdown-manager';
import { TextSelected } from './text-selected';
import { WindowSelected } from './window-selected';

enum TAG_CATEGORIES {
    TEXT = 'text',
    DIV = 'div',
    IMG = 'img',
    VIDEO = 'video',
}

const TAG_TYPES: Record<TAG_CATEGORIES, string[]> = {
    [TAG_CATEGORIES.TEXT]: [
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'p',
        'span',
        'a',
        'strong',
        'b',
        'em',
        'i',
        'mark',
        'code',
        'small',
        'blockquote',
        'pre',
        'time',
        'sub',
        'sup',
        'del',
        'ins',
        'u',
        'abbr',
        'cite',
        'q',
    ],
    [TAG_CATEGORIES.DIV]: ['div'],
    // TODO: Add img and video tag support
    [TAG_CATEGORIES.IMG]: [],
    [TAG_CATEGORIES.VIDEO]: [],
} as const;

const getSelectedTag = (selected: DomElement[]): TAG_CATEGORIES => {
    if (selected.length === 0) {
        return TAG_CATEGORIES.DIV;
    }
    const tag = selected[0]?.tagName;
    if (!tag) {
        return TAG_CATEGORIES.DIV;
    }
    for (const [key, value] of Object.entries(TAG_TYPES)) {
        if (value.includes(tag.toLowerCase())) {
            return key as TAG_CATEGORIES;
        }
    }
    return TAG_CATEGORIES.DIV;
};

export const EditorBar = observer(({ availableWidth }: { availableWidth?: number }) => {
    const editorEngine = useEditorEngine();
    const selectedElement = editorEngine.elements.selected[0];
    const selectedTag = selectedElement ? getSelectedTag(editorEngine.elements.selected) : null;
    const selectedFrame = editorEngine.frames.selected?.[0];
    const windowSelected = selectedFrame && !selectedElement;

    const getTopBar = () => {
        if (windowSelected) {
            return <WindowSelected availableWidth={availableWidth} />;
        }
        if (selectedTag === TAG_CATEGORIES.TEXT) {
            return <TextSelected availableWidth={availableWidth} />;
        }
        return <DivSelected availableWidth={availableWidth} />;
    };

    if (!selectedElement && !selectedFrame) {
        return null;
    }

    return (
        <DropdownManagerProvider>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={cn(
                    'flex flex-col border-[0.5px] border-border p-1 px-1 bg-background rounded-xl backdrop-blur drop-shadow-xl z-50 overflow-hidden',
                    editorEngine.state.editorMode === EditorMode.PREVIEW && !windowSelected && 'hidden',
                )}
                transition={{
                    type: 'spring',
                    bounce: 0.1,
                    duration: 0.4,
                    stiffness: 200,
                    damping: 25,
                }}
            >
                {getTopBar()}
            </motion.div>
        </DropdownManagerProvider>
    );
});
