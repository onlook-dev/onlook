import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useChatContext } from '../../../_hooks/use-chat';

export interface SuggestionsRef {
    handleTabNavigation: (reverse: boolean) => boolean;
    handleEnterSelection: () => boolean;
}

export const Suggestions = observer(
    forwardRef<
        SuggestionsRef,
        {
            disabled: boolean;
            inputValue: string;
            setInput: (input: string) => void;
            onSuggestionFocus?: (isFocused: boolean) => void;
        }
    >(({ disabled, inputValue, setInput, onSuggestionFocus }, ref) => {
        const editorEngine = useEditorEngine();
        const { isWaiting } = useChatContext();
        const { data: settings } = api.user.settings.get.useQuery();
        const [focusedIndex, setFocusedIndex] = useState<number>(-1);
        const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

        const suggestions = editorEngine.chat.suggestions.suggestions;
        const shouldHideSuggestions =
            suggestions.length === 0 ||
            isWaiting ||
            !settings?.chat?.showSuggestions ||
            disabled ||
            inputValue.trim().length > 0 ||
            editorEngine.chat.error.hasError() ||
            editorEngine.error.errors.length > 0;

        const handleTabNavigation = (reverse: boolean) => {
            if (shouldHideSuggestions || suggestions.length === 0) {
                return false;
            }

            // Calculate next index
            const defaultIndex = reverse ? suggestions.length - 1 : 0;
            const nextIndex = focusedIndex === -1 ? defaultIndex : focusedIndex + 1;

            // If we would exceed the suggestions, return false to move to chat input
            if (nextIndex >= suggestions.length) {
                buttonRefs.current[focusedIndex]?.blur();
                setFocusedIndex(-1);
                onSuggestionFocus?.(false);
                return false;
            }

            // Force blur current button before focusing next
            if (focusedIndex !== -1) {
                buttonRefs.current[focusedIndex]?.blur();
            }
            // Force focus next button
            buttonRefs.current[nextIndex]?.focus();
            setFocusedIndex(nextIndex);
            onSuggestionFocus?.(true);
            return true;
        };

        const handleEnterSelection = () => {
            if (focusedIndex === -1 || shouldHideSuggestions || !suggestions[focusedIndex]) {
                return false;
            }
            setInput(suggestions[focusedIndex].prompt);
            setFocusedIndex(-1);
            onSuggestionFocus?.(false);
            return true;
        };

        useImperativeHandle(ref, () => ({
            handleTabNavigation,
            handleEnterSelection,
        }));

        return (
            <motion.div
                tabIndex={-1}
                className="flex flex-col overflow-hidden"
                animate={{ height: shouldHideSuggestions ? 0 : 'auto' }}
                initial={false}
                transition={{ duration: 0.3, ease: 'easeOut' }}
            >
                <motion.div
                    tabIndex={-1}
                    className="flex flex-col gap-2 p-2"
                    animate={{ opacity: shouldHideSuggestions ? 0 : 1 }}
                    initial={false}
                    transition={{ duration: 0.2 }}
                >
                    {suggestions.map((suggestion, index) => (
                        <motion.button
                            ref={(el) => {
                                buttonRefs.current[index] = el;
                            }}
                            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            transition={{
                                delay: 0.1 + index * 0.1,
                                duration: 0.3,
                                ease: 'easeOut',
                            }}
                            key={suggestion.title}
                            className="text-xs flex border border-blue-500/20 items-center gap-2 p-2 
                                text-left text-blue-300 bg-blue-500/10 rounded-lg transition-all 
                                relative hover:bg-blue-500/20 
                                focus:outline-none focus:ring-2 focus:ring-blue-500 
                                focus:border-blue-400/40 focus:bg-blue-500/30 
                                focus:text-blue-200 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                            onClick={() => setInput(suggestion.prompt)}
                            onFocus={() => {
                                setFocusedIndex(index);
                                onSuggestionFocus?.(true);
                            }}
                            onBlur={(e) => {
                                // Don't reset focus if we're moving to another suggestion
                                const isMovingToAnotherSuggestion = buttonRefs.current.includes(
                                    e.relatedTarget as HTMLButtonElement,
                                );
                                if (!isMovingToAnotherSuggestion) {
                                    setFocusedIndex(-1);
                                    onSuggestionFocus?.(false);
                                }
                            }}
                        >
                            <Icons.Lightbulb className="w-4 h-4" />
                            {suggestion.title}
                        </motion.button>
                    ))}
                </motion.div>
            </motion.div>
        );
    }),
);
