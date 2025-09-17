import { useEditorEngine } from '@/components/store/editor';
import type { MessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { AnimatePresence } from 'motion/react';
import { useMemo } from 'react';
import { DraftContextPill } from './draft-context-pill';
import { DraftImagePill } from './draft-image-pill';

const typeOrder = {
    [MessageContextType.BRANCH]: 0,
    [MessageContextType.PROJECT]: 1,
    [MessageContextType.FILE]: 2,
    [MessageContextType.HIGHLIGHT]: 3,
    [MessageContextType.ERROR]: 4,
    [MessageContextType.IMAGE]: 5,
};

export const InputContextPills = observer(() => {
    const editorEngine = useEditorEngine();

    const handleRemoveContext = (contextToRemove: MessageContext) => {
        const newContext = [...editorEngine.chat.context.context].filter(
            (context) => context !== contextToRemove,
        );

        editorEngine.chat.context.context = newContext;
    };

    const sortedContexts = useMemo(() => {
        return [...editorEngine.chat.context.context].sort((a, b) => {
            return typeOrder[a.type] - typeOrder[b.type];
        });
    }, [editorEngine.chat.context.context]);

    return (
        <div>
            <AnimatePresence mode="popLayout">
                {sortedContexts.map((context: MessageContext, index: number) => {
                    if (context.type === MessageContextType.IMAGE) {
                        return (
                            <DraftImagePill
                                key={`image-${context.content}-${index}`}
                                context={context}
                                onRemove={() => handleRemoveContext(context)}
                            />
                        );
                    }
                    return (
                        <DraftContextPill
                            key={`${context.type}-${context.content}-${index}`}
                            context={context}
                            onRemove={() => handleRemoveContext(context)}
                        />
                    );
                })}
            </AnimatePresence>
        </div>
    );
});
