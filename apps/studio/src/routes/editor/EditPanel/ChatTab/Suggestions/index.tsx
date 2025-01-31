import { useEditorEngine } from '@/components/Context';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';

export const Suggestions = observer(
    ({
        setInput,
        disabled,
        inputValue,
    }: {
        setInput: (input: string) => void;
        disabled: boolean;
        inputValue: string;
    }) => {
        const editorEngine = useEditorEngine();

        return (
            <AnimatePresence>
                {!disabled && inputValue.trim().length === 0 && (
                    <motion.div
                        className="flex flex-col gap-2 p-2"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        {editorEngine.chat.suggestions.suggestions.map((suggestion, index) => (
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                key={suggestion}
                                className="text-xs flex border border-blue-500/20 items-center gap-2 p-2 text-left text-blue-300 bg-blue-500/10 rounded-lg transition-colors relative hover:bg-blue-500/20"
                                onClick={() => setInput(suggestion)}
                            >
                                <Icons.Sparkles className="w-4 h-4" />
                                {suggestion}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        );
    },
);
