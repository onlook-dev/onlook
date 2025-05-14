import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { FOCUS_CHAT_INPUT_EVENT } from '@/components/store/editor/chat';
import { EditorTabValue, type ImageMessageContext } from '@onlook/models';
import { MessageContextType } from '@onlook/models/chat';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Textarea } from '@onlook/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { toast } from '@onlook/ui/use-toast';
import { cn } from '@onlook/ui/utils';
import { compressImage } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { InputContextPills } from '../context-pills/input-context-pills';
import { Suggestions, type SuggestionsRef } from '../suggestions';
import { ActionButtons } from './action-buttons';

export const ChatInput = observer(() => {
    const { setMessages, stop, reload, isWaiting } = useChatContext();
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [inputValue, setInputValue] = useState('');
    const [isComposing, setIsComposing] = useState(false);
    const [actionTooltipOpen, setActionTooltipOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const focusInput = () => {
        requestAnimationFrame(() => {
            textareaRef.current?.focus();
        });
    };

    useEffect(() => {
        if (textareaRef.current && !isWaiting) {
            focusInput();
        }
    }, [editorEngine.chat.conversation.current?.messages.length]);

    useEffect(() => {
        if (editorEngine.state.rightPanelTab === EditorTabValue.CHAT) {
            focusInput();
        }
    }, [editorEngine.state.rightPanelTab]);

    useEffect(() => {
        const focusHandler = () => {
            if (textareaRef.current && !isWaiting) {
                focusInput();
            }
        };

        window.addEventListener(FOCUS_CHAT_INPUT_EVENT, focusHandler);
        return () => window.removeEventListener(FOCUS_CHAT_INPUT_EVENT, focusHandler);
    }, []);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && suggestionRef.current?.handleEnterSelection()) {
                e.preventDefault();
                e.stopPropagation();
                // Stop the event from bubbling to the canvas
                e.stopImmediatePropagation();
                // Handle the suggestion selection
                suggestionRef.current.handleEnterSelection();
            }
        };

        // Capture phase to intercept before it reaches the canvas
        window.addEventListener('keydown', handleGlobalKeyDown, true);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
    }, []);

    const disabled = isWaiting || editorEngine.chat.context.context.length === 0;
    const inputEmpty = !inputValue || inputValue.trim().length === 0;

    function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
        if (isComposing) {
            return;
        }
        e.currentTarget.style.height = 'auto';
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            // Always prevent default tab behavior
            e.preventDefault();
            e.stopPropagation();

            // Only let natural tab order continue if handleTabNavigation returns false
            const handled = suggestionRef.current?.handleTabNavigation();
            if (!handled) {
                // Focus the textarea
                textareaRef.current?.focus();
            }
        } else if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
            e.preventDefault();
            e.stopPropagation();

            if (suggestionRef.current?.handleEnterSelection()) {
                setTimeout(() => textareaRef.current?.focus(), 0);
                return;
            }

            if (!inputEmpty) {
                sendMessage();
            }
        }
    };

    async function sendMessage() {
        if (inputEmpty) {
            console.warn('Empty message');
            return;
        }
        if (isWaiting) {
            console.warn('Already waiting for response');
            return;
        }
        const streamMessages = await editorEngine.chat.getStreamMessages(inputValue);
        if (!streamMessages) {
            toast({
                title: 'Error',
                description: 'Failed to send message. Please try again.',
            });
            return;
        }

        setMessages(streamMessages);
        reload();
        setInputValue('');
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData.items;

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (!file) {
                    continue;
                }
                handleImageEvent(file, 'Pasted image');
                break;
            }
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.removeAttribute('data-dragging-image');

        const items = e.dataTransfer.items;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (!file) {
                    continue;
                }
                handleImageEvent(file, 'Dropped image');
                break;
            }
        }
    };

    const handleImageEvent = async (file: File, displayName?: string) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const compressedImage = await compressImage(file);
            const base64URL = compressedImage || (event.target?.result as string);
            const contextImage: ImageMessageContext = {
                type: MessageContextType.IMAGE,
                content: base64URL,
                mimeType: file.type,
                displayName: displayName ?? file.name,
            };
            editorEngine.chat.context.context.push(contextImage);
        };
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDragStateChange = (isDragging: boolean, e: React.DragEvent) => {
        const hasImage =
            e.dataTransfer.types.length > 0 &&
            Array.from(e.dataTransfer.items).some(
                (item) =>
                    item.type.startsWith('image/') ||
                    (item.type === 'Files' && e.dataTransfer.types.includes('public.file-url')),
            );
        if (hasImage) {
            setIsDragging(isDragging);
            e.currentTarget.setAttribute('data-dragging-image', isDragging.toString());
        }
    };

    const suggestionRef = useRef<SuggestionsRef>(null);

    const bubbleDragEvent = (e: React.DragEvent<HTMLTextAreaElement>, eventType: string) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.parentElement?.dispatchEvent(
            new DragEvent(eventType, {
                bubbles: true,
                cancelable: true,
                dataTransfer: e.dataTransfer,
            }),
        );
    };

    return (
        <div
            className={cn(
                'flex flex-col w-full text-foreground-tertiary border-t text-small transition-colors duration-200 [&[data-dragging-image=true]]:bg-teal-500/40',
                isDragging && 'cursor-copy',
            )}
            onDrop={(e) => {
                handleDrop(e);
                setIsDragging(false);
            }}
            onDragOver={handleDragOver}
            onDragEnter={(e) => {
                e.preventDefault();
                handleDragStateChange(true, e);
            }}
            onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    handleDragStateChange(false, e);
                }
            }}
        >
            <Suggestions
                ref={suggestionRef}
                disabled={disabled}
                inputValue={inputValue}
                setInput={(suggestion) => {
                    setInputValue(suggestion);
                    textareaRef.current?.focus();
                    setTimeout(() => {
                        if (textareaRef.current) {
                            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                        }
                    }, 100);
                }}
                onSuggestionFocus={(isFocused) => {
                    if (!isFocused) {
                        textareaRef.current?.focus();
                    }
                }}
            />
            <div className="flex flex-col w-full p-4">
                <InputContextPills />
                <Textarea
                    ref={textareaRef}
                    disabled={disabled}
                    placeholder={
                        disabled
                            ? t('editor.panels.edit.tabs.chat.emptyState')
                            : t('editor.panels.edit.tabs.chat.input.placeholder')
                    }
                    className={cn(
                        'bg-transparent dark:bg-transparent mt-2 overflow-auto max-h-32 text-small p-0 border-0 focus-visible:ring-0 shadow-none rounded-none caret-[#FA003C] resize-none',
                        'selection:bg-[#FA003C]/30 selection:text-[#FA003C] text-foreground-primary placeholder:text-foreground-primary/50 cursor-text',
                        isDragging ? 'pointer-events-none' : 'pointer-events-auto',
                    )}
                    rows={3}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={(e) => {
                        setIsComposing(false);
                    }}
                    onDragEnter={(e) => {
                        bubbleDragEvent(e, 'dragenter');
                    }}
                    onDragOver={(e) => {
                        bubbleDragEvent(e, 'dragover');
                    }}
                    onDragLeave={(e) => {
                        bubbleDragEvent(e, 'dragleave');
                    }}
                    onDrop={(e) => {
                        bubbleDragEvent(e, 'drop');
                    }}
                />
            </div>
            <div className="flex flex-row w-full justify-between pt-2 pb-2 px-2">
                <ActionButtons disabled={disabled} handleImageEvent={handleImageEvent} />
                {isWaiting ? (
                    <Tooltip open={actionTooltipOpen} onOpenChange={setActionTooltipOpen}>
                        <TooltipTrigger asChild>
                            <Button
                                size={'icon'}
                                variant={'secondary'}
                                className="text-smallPlus w-fit h-full py-0.5 px-2.5 text-primary"
                                onClick={() => {
                                    setActionTooltipOpen(false);
                                    stop();
                                }}
                            >
                                <Icons.Stop />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{'Stop response'}</TooltipContent>
                    </Tooltip>
                ) : (
                    <Button
                        size={'icon'}
                        variant={'secondary'}
                        className="text-smallPlus w-fit h-full py-0.5 px-2.5 text-primary"
                        disabled={inputEmpty || status !== 'ready'}
                        onClick={sendMessage}
                    >
                        <Icons.ArrowRight />
                    </Button>
                )}
            </div>
        </div>
    );
});
