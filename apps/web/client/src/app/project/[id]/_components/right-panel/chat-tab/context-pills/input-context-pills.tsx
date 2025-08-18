import { useEditorEngine } from '@/components/store/editor';
import type { MessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { AnimatePresence } from 'motion/react';
import { DraftContextPill } from './draft-context-pill';
import { DraftImagePill } from './draft-image-pill';

export const InputContextPills = observer(() => {
    const editorEngine = useEditorEngine();

    const handleRemoveContext = (contextToRemove: MessageContext) => {
        const newContext = [...editorEngine.chat.context.context].filter(
            (context) => context !== contextToRemove,
        );

        editorEngine.chat.context.context = newContext;
    };

    return (
        <div
            className={cn(
                'flex flex-row flex-wrap w-full gap-1.5 text-micro mb-1 text-foreground-secondary',
                editorEngine.chat.context.context.length > 0 ? 'min-h-6' : 'h-0',
            )}
        >
            <AnimatePresence mode="popLayout">
                {editorEngine.chat.context.context.map(
                    (context: MessageContext, index: number) => {
                        if (context.type === MessageContextType.IMAGE) {
                            return (
                                <DraftImagePill
                                    key={`image-${context.content}`}
                                    context={context}
                                    onRemove={() => handleRemoveContext(context)}
                                />
                            );
                        }
                        return (
                            <DraftContextPill
                                key={`${context.type}-${context.content}`}
                                context={context}
                                onRemove={() => handleRemoveContext(context)}
                            />
                        );
                    },
                )}
            </AnimatePresence>
        </div>
    );
});
