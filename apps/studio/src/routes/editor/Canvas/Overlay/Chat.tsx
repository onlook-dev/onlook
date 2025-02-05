import type { RectDimensions } from '@/lib/editor/engine/overlay/rect';
import { ContextMenu } from '@onlook/ui/context-menu';
import { ToggleGroup, ToggleGroupItem } from '@onlook/ui/toggle-group';
import { useState, useRef, useEffect } from 'react';
import { Input } from '@onlook/ui/input';
import { Button } from '@onlook/ui/button';
import { Textarea } from '@onlook/ui/textarea';
import { cn } from '@onlook/ui/utils';
import { StyleMode } from '@/lib/editor/engine/style';
import { useEditorEngine } from '@/components/Context';
import { Icons } from '@onlook/ui/icons/index';

interface ChatProps {
    rect: RectDimensions;
    isOpen: boolean;
}

const SINGLE_LINE_HEIGHT = 32;
const MIN_INPUT_WIDTH = 280;
const CHAT_BUTTON_OFFSET = 52;
const INPUT_OFFSET_SINGLE = 108;
const INPUT_OFFSET_MULTI = 210;
const MIN_WORDS_TO_SUBMIT = 3;
const MULTI_LINE_ROWS = 3;

const DEFAULT_INPUT_STATE = {
    value: '',
    isVisible: false,
    isMultiline: false,
    isSubmitting: false,
};

export const Chat = ({ rect, isOpen }: ChatProps) => {
    const [inputState, setInputState] = useState(DEFAULT_INPUT_STATE);

    const editorEngine = useEditorEngine();
    const selectedEl = editorEngine.elements.selected[0];
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    if (!isOpen) {
        return null;
    }

    const inputStyle: React.CSSProperties = {
        position: 'absolute',
        top: rect.top - (inputState.isMultiline ? INPUT_OFFSET_MULTI : INPUT_OFFSET_SINGLE),
        left: rect.left,
        minWidth: `${MIN_INPUT_WIDTH}px`,
        zIndex: 1000,
        pointerEvents: 'auto',
    };

    const chatStyle: React.CSSProperties = {
        position: 'absolute',
        top: rect.top - CHAT_BUTTON_OFFSET,
        left: rect.left,
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
                    isMultiline: scrollHeight > SINGLE_LINE_HEIGHT,
                }));
            }
        } else {
            setInputState((prev) => ({ ...prev, isMultiline: false }));
            return;
        }
    };

    const handleToggleChat = () => {
        setInputState((prev) => ({ ...prev, isVisible: !prev.isVisible, value: '' }));
    };

    useEffect(() => {
        if (!isOpen) {
            setInputState(DEFAULT_INPUT_STATE);
        }
    }, [isOpen]);

    return (
        <>
            <div
                style={chatStyle}
                onClick={(e) => e.stopPropagation()}
                className="bg-background-secondary/75 rounded-lg p-1 flex flex-row gap-2"
            >
                <ToggleGroup
                    type="single"
                    value={inputState.isVisible ? 'chat' : 'input'}
                    onValueChange={handleToggleChat}
                >
                    <ToggleGroupItem value="chat">
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
                        'bg-background-secondary/75 rounded-lg p-2',
                        'flex flex-row gap-2',
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
                            'w-full text-xs break-normal p-1.5 focus-visible:ring-0 resize-none shadow-none border-[0.5px]',
                            'transition-colors duration-150',
                            editorEngine.style.mode === StyleMode.Root
                                ? 'bg-background-tertiary text-foreground-active border-background-tertiary cursor-text'
                                : 'bg-background-secondary/75 text-foreground-muted border-background-secondary/75 group-hover:bg-background-tertiary/50 group-hover:text-foreground-active group-hover:border-background-tertiary/50 cursor-pointer',
                            selectedEl.instanceId
                                ? 'rounded-t-none'
                                : 'bg-background-secondary/75 focus:bg-background-tertiary',
                        )}
                        value={inputState.value}
                        onChange={handleTextareaChange}
                        placeholder="Type your message..."
                        style={{
                            resize: 'none',
                            minHeight: SINGLE_LINE_HEIGHT,
                            overflow: 'hidden',
                        }}
                        rows={inputState.isMultiline ? MULTI_LINE_ROWS : 1}
                        autoFocus
                        disabled={inputState.isSubmitting}
                    />
                    {inputState.value.trim().split(/\s+/).filter(Boolean).length >=
                        MIN_WORDS_TO_SUBMIT && (
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
