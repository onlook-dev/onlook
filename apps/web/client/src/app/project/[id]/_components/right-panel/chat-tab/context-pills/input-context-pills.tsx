import { useEditorEngine } from '@/components/store/editor';
import type { MessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { observer } from 'mobx-react-lite';
import { AnimatePresence } from 'motion/react';
import { useMemo } from 'react';
import { DraftContextPill } from './draft-context-pill';
import { ImagePill } from './image-pill';

const typeOrder = {
    [MessageContextType.BRANCH]: 0,
    [MessageContextType.FILE]: 1,
    [MessageContextType.HIGHLIGHT]: 2,
    [MessageContextType.ERROR]: 3,
    [MessageContextType.AGENT_RULE]: 4,
    [MessageContextType.IMAGE]: 5,
    [MessageContextType.LOCAL_IMAGE]: 6,
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
        return [...editorEngine.chat.context.context]
            .sort((a, b) => {
                return typeOrder[a.type] - typeOrder[b.type];
            });
    }, [editorEngine.chat.context.context]);

    return (
        <div className="flex flex-row flex-wrap items-center gap-1.5 px-1 pt-1">
            <AnimatePresence mode="popLayout">
                {sortedContexts.map((context: MessageContext, index: number) => {
                    if (context.type === MessageContextType.IMAGE || context.type === MessageContextType.LOCAL_IMAGE) {
                        return (
                            <ImagePill
                                key={`${context.type}-${context.content}-${index}`}
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
