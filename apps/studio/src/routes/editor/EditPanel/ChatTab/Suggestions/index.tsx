import { useEditorEngine, useUserManager } from '@/components/Context';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';

export const Suggestions = observer(
    ({
        disabled,
        inputValue,
        setInput,
    }: {
        disabled: boolean;
        inputValue: string;
        setInput: (input: string) => void;
    }) => {
        const editorEngine = useEditorEngine();
        const userManager = useUserManager();

        const shouldHideSuggestions =
            editorEngine.chat.suggestions.shouldHide ||
            !userManager.settings?.chatSettings?.showSuggestions ||
            disabled ||
            inputValue.trim().length > 0 ||
            editorEngine.errors.errors.length > 0;

        return (
            <AnimatePresence>
                {!shouldHideSuggestions && (
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
                                key={suggestion.title}
                                className="text-xs flex border border-blue-500/20 items-center gap-2 p-2 text-left text-blue-300 bg-blue-500/10 rounded-lg transition-colors relative hover:bg-blue-500/20"
                                onClick={() => setInput(suggestion.prompt)}
                            >
                                <Icons.Sparkles className="w-4 h-4" />
                                {suggestion.title}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        );
    },
);
