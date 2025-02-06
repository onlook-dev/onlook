import { ToggleGroup, ToggleGroupItem } from '@onlook/ui/toggle-group';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@onlook/ui/button';
import { Textarea } from '@onlook/ui/textarea';
import { cn } from '@onlook/ui/utils';
import { StyleMode } from '@/lib/editor/engine/style';
import { useEditorEngine } from '@/components/Context';
import { Icons } from '@onlook/ui/icons/index';
import type { RectDimensions } from '@/lib/editor/engine/overlay/rect';

const SPACING = {
    base: 8,
    padding: 16,
    gap: 8,
};

const DIMENSIONS = {
    singleLineHeight: 32,
    minInputWidth: 280,
    buttonHeight: 36, // Standard button height
    multiLineRows: 3,
    minWordsToSubmit: 3,
};

const getOffsets = (isMultiline: boolean) => {
    const chatButtonHeight = DIMENSIONS.buttonHeight + SPACING.padding;
    const inputHeight = isMultiline
        ? DIMENSIONS.singleLineHeight * DIMENSIONS.multiLineRows +
          SPACING.padding +
          DIMENSIONS.buttonHeight
        : DIMENSIONS.singleLineHeight + SPACING.padding;

    return {
        chatButton: chatButtonHeight,
        input: chatButtonHeight + inputHeight + SPACING.gap,
    };
};

const DEFAULT_INPUT_STATE = {
    value: '',
    isVisible: false,
    isMultiline: false,
    isSubmitting: false,
};

export const Chat = ({ selectedEl }: { selectedEl: RectDimensions | null }) => {
    const [inputState, setInputState] = useState(DEFAULT_INPUT_STATE);

    const editorEngine = useEditorEngine();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
            await editorEngine.chat.sendNewMessage(inputState.value);
            setInputState((prev) => ({
                ...prev,
                value: '',
                isSubmitting: false,
                isVisible: false,
                isMultiline: false,
            }));
        } catch (error) {
            console.error('Failed to send message:', error);
            setInputState((prev) => ({ ...prev, isSubmitting: false }));
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputState((prev) => ({ ...prev, value: e.target.value }));
        if (e.target.value) {
            if (textareaRef.current) {
                const scrollHeight = textareaRef.current.scrollHeight;
                setInputState((prev) => ({
                    ...prev,
                    isMultiline: scrollHeight > DIMENSIONS.singleLineHeight,
                }));
            }
        } else {
            setInputState((prev) => ({ ...prev, isMultiline: false }));
            return;
        }
    };

    const handleToggleChat = () => {
        if (selectedEl) {
            setInputState((prev) => ({ ...prev, isVisible: !prev.isVisible, value: '' }));
        }
    };

    useEffect(() => {
        if (!selectedEl) {
            setInputState(DEFAULT_INPUT_STATE);
        }
    }, [selectedEl]);

    return (
        <>
            <div
                style={chatStyle}
                onClick={(e) => e.stopPropagation()}
                className="bg-background-secondary/75 rounded-xl p-1 flex flex-row gap-2"
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
                <div
                    style={inputStyle}
                    className={cn(
                        'bg-background-secondary/75 rounded-xl p-1',
                        'flex flex-row gap-1',
                        inputState.isMultiline ? 'flex-col' : 'flex-row items-center',
                    )}
                >
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleToggleChat}
                        className="h-6 w-6"
                    >
                        <Icons.CrossS className="h-4 w-4" />
                    </Button>
                    <Textarea
                        aria-label="Chat message input"
                        ref={textareaRef}
                        className={cn(
                            'w-full text-xs break-normal p-1.5 focus-visible:ring-0 resize-none shadow-none border-[0.5px] rounded-lg',
                            'transition-colors duration-150',
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
                            overflow: 'hidden',
                        }}
                        rows={inputState.isMultiline ? DIMENSIONS.multiLineRows : 1}
                        autoFocus
                        disabled={inputState.isSubmitting}
                    />
                    {inputState.value.trim().split(/\s+/).filter(Boolean).length >=
                        DIMENSIONS.minWordsToSubmit && (
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            className={inputState.isMultiline ? 'self-end' : ''}
                            disabled={inputState.isSubmitting}
                        >
                            Submit
                        </Button>
                    )}
                </div>
            )}
        </>
    );
};
