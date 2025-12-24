import { useEditorEngine } from '@/components/store/editor';
import type { ImageMessageContext, MessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { assertNever } from '@onlook/utility';
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
};

const getStableKey = (context: MessageContext, index: number): string => {
    switch (context.type) {
        case MessageContextType.FILE:
            return `file-${context.path}-${context.branchId}`;
        case MessageContextType.HIGHLIGHT:
            return `highlight-${context.path}-${context.start}-${context.end}-${context.branchId}`;
        case MessageContextType.IMAGE:
            return `image-${context.id || index}`;
        case MessageContextType.BRANCH:
            return `branch-${context.branch.id}`;
        case MessageContextType.ERROR:
            return `error-${context.branchId}`;
        case MessageContextType.AGENT_RULE:
            return `agent-rule-${context.path}`;
        default:
            assertNever(context);
    }
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
                    const key = getStableKey(context, index);

                    if (context.type === MessageContextType.IMAGE) {
                        return (
                            <ImagePill
                                key={key}
                                context={context as ImageMessageContext}
                                onRemove={() => handleRemoveContext(context)}
                            />
                        );
                    }
                    return (
                        <DraftContextPill
                            key={key}
                            context={context}
                            onRemove={() => handleRemoveContext(context)}
                        />
                    );
                })}
            </AnimatePresence>
        </div>
    );
});
