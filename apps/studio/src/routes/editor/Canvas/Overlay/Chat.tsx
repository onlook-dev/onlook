import { ToggleGroup, ToggleGroupItem } from '@onlook/ui/toggle-group';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@onlook/ui/button';
import { Textarea } from '@onlook/ui/textarea';
import { cn } from '@onlook/ui/utils';
import { StyleMode } from '@/lib/editor/engine/style';
import { useEditorEngine } from '@/components/Context';
import { Icons } from '@onlook/ui/icons/index';
import { EditorTabValue } from '@/lib/models';
import debounce from 'lodash/debounce';
import type { ClickRectState } from '@/lib/editor/engine/overlay/state';

const SPACING = {
    base: 8,
    padding: 16,
};

const DIMENSIONS = {
    singleLineHeight: 32,
    minInputWidth: 280,
    buttonHeight: 36, // Standard button height
    multiLineRows: 4,
    minCharsToSubmit: 4,
};

const getOffsets = (isMultiline: boolean) => {
    const chatButtonHeight = DIMENSIONS.buttonHeight + SPACING.padding;
    const inputHeight = isMultiline
        ? DIMENSIONS.singleLineHeight * (DIMENSIONS.multiLineRows - 1) + SPACING.padding
        : DIMENSIONS.singleLineHeight + SPACING.padding;

    return {
        chatButton: chatButtonHeight,
        input: chatButtonHeight + inputHeight,
    };
};

const DEFAULT_INPUT_STATE = {
    value: '',
    isVisible: false,
    isMultiline: false,
    isSubmitting: false,
};

export const Chat = ({
    selectedEl,
    elementId,
}: {
    selectedEl: ClickRectState | null;
    elementId: string;
}) => {
    const [inputState, setInputState] = useState(DEFAULT_INPUT_STATE);
    const [isComposing, setIsComposing] = useState(false);

    const editorEngine = useEditorEngine();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const debouncedSetMultiline = useCallback(
        debounce((scrollHeight: number) => {
            setInputState((prev) => ({
                ...prev,
                isMultiline: scrollHeight > DIMENSIONS.singleLineHeight,
            }));
        }, 150),
        [],
    );

    useEffect(() => {
        setInputState(DEFAULT_INPUT_STATE);
    }, [elementId]);

    if (!selectedEl) {
        return null;
    }

    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        top:
            selectedEl.top -
            DIMENSIONS.buttonHeight -
            SPACING.padding / 8 -
            (inputState.isVisible ? DIMENSIONS.singleLineHeight / 2 : 0),
        left: selectedEl.left + selectedEl.width / 2,
        transform: 'translateX(-50%)',
        zIndex: 40,
        pointerEvents: 'auto',
    };

    const handleSubmit = async () => {
        try {
            setInputState((prev) => ({ ...prev, isSubmitting: true }));
            editorEngine.editPanelTab = EditorTabValue.CHAT;
            setInputState((prev) => ({
                ...prev,
                value: '',
                isSubmitting: false,
                isVisible: false,
                isMultiline: false,
            }));

            await editorEngine.chat.sendNewMessage(inputState.value);
        } catch (error) {
            console.error('Failed to send message:', error);
            setInputState((prev) => ({ ...prev, isSubmitting: false }));
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputState((prev) => ({ ...prev, value: e.target.value }));

        if (textareaRef.current) {
            // Reset height to auto to get the correct scrollHeight
            textareaRef.current.style.height = 'auto';
            // Calculate max height (4 lines)
            const maxHeight = DIMENSIONS.singleLineHeight * 4;
            // Set height, capped at maxHeight
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;

            // Scroll to bottom
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;

            // Update multiline state based on content height
            debouncedSetMultiline(textareaRef.current.scrollHeight);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
            e.preventDefault();
            const charCount = inputState.value.trim().length;
            if (charCount >= DIMENSIONS.minCharsToSubmit) {
                handleSubmit();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setInputState((prev) => ({ ...prev, isVisible: false, value: '' }));
        }
    };

    return (
        <div style={containerStyle} onClick={(e) => e.stopPropagation()}>
            <div
                className={cn(
                    'rounded-xl backdrop-blur-lg transition-all duration-200',
                    inputState.isVisible
                        ? 'bg-background/80 border shadow p-1'
                        : 'bg-background-secondary/30 dark:bg-background/85 border-foreground-secondary/20 hover:border-foreground-secondary/50 p-0.5',
                    'border flex relative',
                )}
            >
                {!inputState.isVisible ? (
                    // Chat Button
                    <button
                        onClick={() => setInputState((prev) => ({ ...prev, isVisible: true }))}
                        className="rounded-lg hover:text-foreground-primary transition-colors px-2.5 py-1 flex flex-row items-center gap-2 w-full"
                    >
                        <Icons.Sparkles className="w-4 h-4" />
                        <span className="text-miniPlus whitespace-nowrap">Chat with AI</span>
                    </button>
                ) : (
                    // Input Field
                    <div className="flex flex-row items-top gap-1 w-full min-w-[280px] relative">
                        <Button
                            size="icon"
                            onClick={() =>
                                setInputState((prev) => ({ ...prev, isVisible: false, value: '' }))
                            }
                            className={cn(
                                'h-6 w-6 absolute left-2 z-10 border-none shadow-none bg-transparent hover:bg-transparent',
                                'transition-all duration-200',
                                inputState.value.trim().length >= DIMENSIONS.minCharsToSubmit
                                    ? 'opacity-0 -translate-x-2 scale-75 pointer-events-none'
                                    : 'opacity-100 translate-x-0 scale-100 pointer-events-auto',
                            )}
                            disabled={inputState.isSubmitting}
                        >
                            <Icons.CrossS className="h-4 w-4 text-foreground-active dark:text-white" />
                        </Button>
                        <Textarea
                            aria-label="Chat message input"
                            ref={textareaRef}
                            className={cn(
                                'w-full text-xs break-words p-1.5 focus-visible:ring-0 resize-none shadow-none border-[0.5px] rounded-lg',
                                'transition-all duration-150 ease-in-out',
                                'pr-10 backdrop-blur-lg',
                                inputState.value.trim().length >= DIMENSIONS.minCharsToSubmit
                                    ? 'pl-2'
                                    : 'pl-8',
                                'bg-background-secondary/75 text-foreground-primary border-background-secondary/75',
                                'max-h-[80px] caret-[#FA003C]',
                                'selection:bg-[#FA003C]/30 selection:text-[#FA003C]',
                            )}
                            value={inputState.value}
                            onChange={handleTextareaChange}
                            placeholder="Type your message..."
                            style={{
                                resize: 'none',
                                minHeight: DIMENSIONS.singleLineHeight,
                                height: 'auto',
                                overflowY: 'auto', // Always allow vertical scrolling
                                overflowX: 'hidden',
                                overscrollBehavior: 'contain',
                                lineHeight: '1.5',
                            }}
                            rows={1}
                            autoFocus
                            disabled={inputState.isSubmitting}
                            onKeyDown={handleKeyDown}
                            onCompositionStart={() => setIsComposing(true)}
                            onCompositionEnd={(e) => {
                                setIsComposing(false);
                            }}
                        />
                        {inputState.value.trim().length >= DIMENSIONS.minCharsToSubmit && (
                            <Button
                                size="icon"
                                variant="secondary"
                                onClick={handleSubmit}
                                className={cn(
                                    'absolute right-0.5 bottom-0.5 h-7 w-7',
                                    'bg-foreground-primary text-white hover:bg-foreground-hover',
                                )}
                                disabled={inputState.isSubmitting}
                            >
                                <Icons.ArrowUp className="h-4 w-4 text-background" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
