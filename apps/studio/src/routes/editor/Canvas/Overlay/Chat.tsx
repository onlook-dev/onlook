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
    minWordsToSubmit: 4,
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

    const inputStyle: React.CSSProperties = {
        position: 'absolute',
        top: selectedEl.top - getOffsets(inputState.isMultiline).input,
        left: selectedEl.left,
        minWidth: `${DIMENSIONS.minInputWidth}px`,
        zIndex: 1000,
        pointerEvents: 'auto',
    };

    const chatStyle: React.CSSProperties = {
        position: 'absolute',
        top: selectedEl.top - getOffsets(false).chatButton,
        left: selectedEl.left,
        zIndex: 1000,
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
        if (e.target.value) {
            if (textareaRef.current) {
                debouncedSetMultiline(textareaRef.current.scrollHeight);
            }
        } else {
            setInputState((prev) => ({ ...prev, isMultiline: false }));
            debouncedSetMultiline.cancel();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const wordCount = inputState.value.trim().split(/\s+/).filter(Boolean).length;
            if (wordCount >= DIMENSIONS.minWordsToSubmit) {
                handleSubmit();
            }
        }
    };

    const handleToggleChat = () => {
        if (selectedEl) {
            setInputState((prev) => ({ ...prev, isVisible: !prev.isVisible, value: '' }));
        }
    };

    return (
        <>
            <div
                style={chatStyle}
                onClick={(e) => e.stopPropagation()}
                className="bg-background-secondary/30 dark:bg-background/85 rounded-xl p-1 flex flex-row gap-2 border backdrop-blur-lg drop-shadow-xl"
            >
                <ToggleGroup
                    type="single"
                    value={inputState.isVisible ? 'chat' : 'input'}
                    onValueChange={handleToggleChat}
                >
                    <ToggleGroupItem value="chat" className="rounded-lg">
                        <div className="flex flex-row gap-2 items-center p-1 min-w-28">
                            <Icons.Sparkles className="w-4 h-4" />
                            <span>Chat with AI</span>
                        </div>
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>
            {inputState.isVisible && (
                <div style={inputStyle}>
                    <div
                        className={cn(
                            'bg-background/80 rounded-xl p-1 border backdrop-blur-lg shadow',
                            'flex flex-row gap-1 relative',
                            inputState.isMultiline ? 'flex-col' : 'flex-row items-center',
                        )}
                    >
                        <Button
                            size="icon"
                            onClick={handleToggleChat}
                            className="h-6 w-6 absolute left-2 z-10 border-none shadow-none bg-transparent hover:bg-transparent"
                            disabled={inputState.isSubmitting}
                        >
                            <Icons.CrossS className="h-4 w-4 text-foreground-active dark:text-white" />
                        </Button>
                        <Textarea
                            aria-label="Chat message input"
                            ref={textareaRef}
                            className={cn(
                                'w-full text-xs break-normal p-1.5 focus-visible:ring-0 resize-none shadow-none border-[0.5px] rounded-lg',
                                'transition-colors duration-150',
                                'pr-10 pl-8 backdrop-blur-lg',
                                editorEngine.style.mode === StyleMode.Root
                                    ? 'bg-background-tertiary text-foreground-active border-background-tertiary cursor-text'
                                    : 'bg-background-secondary/75 text-foreground-muted border-background-secondary/75 group-hover:bg-background-tertiary/50 group-hover:text-foreground-active group-hover:border-background-tertiary/50 cursor-pointer',
                            )}
                            value={inputState.value}
                            onChange={handleTextareaChange}
                            placeholder="Type your message..."
                            style={{
                                resize: 'none',
                                minHeight: DIMENSIONS.singleLineHeight,
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                overscrollBehavior: 'contain',
                                // There is a bug with the textarea where it scrolls, the whole page scrolls.
                            }}
                            rows={inputState.isMultiline ? DIMENSIONS.multiLineRows : 1}
                            autoFocus
                            disabled={inputState.isSubmitting}
                            onKeyDown={handleKeyDown}
                        />
                        {inputState.value.trim().split(/\s+/).filter(Boolean).length >=
                            DIMENSIONS.minWordsToSubmit && (
                            <div
                                className={cn(
                                    'absolute right-2 h-full flex flex-col ',
                                    inputState.isMultiline ? 'pb-3 justify-end' : 'justify-center',
                                )}
                            >
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleSubmit}
                                    className="rounded-full p-0 w-6 h-6 border-2 border-foreground-active dark:border-white"
                                    disabled={inputState.isSubmitting}
                                >
                                    <Icons.ArrowUp className="h-4 w-4 text-foreground-active dark:text-white" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
