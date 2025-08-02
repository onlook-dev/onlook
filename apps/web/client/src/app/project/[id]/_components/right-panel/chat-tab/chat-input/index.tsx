import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { FOCUS_CHAT_INPUT_EVENT } from '@/components/store/editor/chat';
import { transKeys } from '@/i18n/keys';
import { ChatType, EditorTabValue, type ImageMessageContext } from '@onlook/models';
import { MessageContextType } from '@onlook/models/chat';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { Textarea } from '@onlook/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { compressImageInBrowser } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { InputContextPills } from '../context-pills/input-context-pills';
import { Suggestions, type SuggestionsRef } from '../suggestions';
import { ActionButtons } from './action-buttons';
import { ChatModeToggle } from './chat-mode-toggle';
import { AtMenu } from '../at-menu';
import type { AtMenuItem, AtMenuState, Mention } from '@/components/store/editor/chat/at-menu/types';

export const ChatInput = observer(({
    inputValue,
    setInputValue,
    atMenuState,
    setAtMenuState,
}: {
    inputValue: string;
    setInputValue: React.Dispatch<React.SetStateAction<string>>;
    atMenuState: AtMenuState;
    setAtMenuState: React.Dispatch<React.SetStateAction<AtMenuState>>;
}) => {
    const { sendMessages, stop, isWaiting } = useChatContext();
    const editorEngine = useEditorEngine();
    

    const t = useTranslations();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const suggestionRef = useRef<SuggestionsRef>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [actionTooltipOpen, setActionTooltipOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [chatMode, setChatMode] = useState<ChatType>(ChatType.EDIT);
    
    const [mentions, setMentions] = useState<Mention[]>([]);

    const focusInput = () => {
        requestAnimationFrame(() => {
            textareaRef.current?.focus();
        });
    };

    useEffect(() => {
        if (textareaRef.current && !isWaiting) {
            focusInput();
        }
    }, [editorEngine.chat.conversation.current?.messages]);

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

    // Find mentions in text
    const findMentions = (text: string): Mention[] => {
      const mentionRegex = /@(\w+(?:\.\w+)*)/g;
      const foundMentions: Mention[] = [];
      let match;

      while ((match = mentionRegex.exec(text)) !== null) {
        if (match[1]) {
          foundMentions.push({
            id: `mention-${match.index}`,
            name: match[1],
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      }

      return foundMentions;
    };

    // Update mentions whenever input value changes
    useEffect(() => {
      const newMentions = findMentions(inputValue);
      setMentions(newMentions);
    }, [inputValue]);

    function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
        if (isComposing) {
            return;
        }
        
        const value = e.target.value;
        const prevValue = inputValue;
        
        // Check if user just typed a new "@" character
        const newAtTyped = value.length > prevValue.length && value.endsWith('@');
        
        if (newAtTyped) {
            console.log('Opening @ menu - newAtTyped detected');
            // Open @ menu
            const input = textareaRef.current;
            if (input) {
                const rect = input.getBoundingClientRect();
                const inputPadding = 12; // p-3 = 12px padding
                
                // Calculate position for @ menu
                const atIndex = value.lastIndexOf('@');
                const textBeforeAt = value.substring(0, atIndex);
                
                // Create a temporary span to measure text width
                const span = document.createElement('span');
                span.style.visibility = 'hidden';
                span.style.position = 'absolute';
                span.style.whiteSpace = 'pre';
                span.style.font = window.getComputedStyle(input).font;
                span.textContent = textBeforeAt;
                
                document.body.appendChild(span);
                const textWidth = span.offsetWidth;
                document.body.removeChild(span);
                
                const newState = {
                    isOpen: true,
                    position: {
                        top: rect.top, // Use the textarea's top position as reference
                        left: rect.left + inputPadding + textWidth
                    },
                    selectedIndex: 0,
                    searchQuery: '',
                    activeMention: true
                };
                
                console.log('Setting @ menu state:', newState);
                setAtMenuState(prev => ({
                    ...prev,
                    ...newState
                }));
            } else {
                console.error('textareaRef.current is null');
            }
        } else if (atMenuState.activeMention && value.includes('@')) {
            // If we're in active mention mode and still have @, keep menu open
            const lastAtIndex = value.lastIndexOf('@');
            const textAfterAt = value.substring(lastAtIndex + 1);
            setAtMenuState(prev => ({
                ...prev,
                searchQuery: textAfterAt
            }));
        } else {
            // Close @ menu when @ is not present
            setAtMenuState(prev => ({
                ...prev,
                isOpen: false,
                activeMention: false,
                searchQuery: '',
                previewText: ''
            }));
        }
        
        e.currentTarget.style.height = 'auto';
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Handle @ menu keyboard navigation
        if (atMenuState.isOpen) {
            switch (e.key) {
                case 'ArrowDown':
                case 'ArrowUp':
                case 'Enter':
                case 'Escape':
                    e.preventDefault();
                    e.stopPropagation();
                    return;
            }
        }

        if (e.key === 'Tab') {
            // Always prevent default tab behavior
            e.preventDefault();
            e.stopPropagation();

            // Only let natural tab order continue if handleTabNavigation returns false
            const handled = suggestionRef.current?.handleTabNavigation(e.shiftKey);
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
        const savedInput = inputValue.trim();

        const streamMessages = chatMode === ChatType.ASK
            ? await editorEngine.chat.getAskMessages(savedInput)
            : await editorEngine.chat.getEditMessages(savedInput);

        if (!streamMessages) {
            toast.error('Failed to send message. Please try again.');
            setInputValue(savedInput);
            return;
        }

        await sendMessages(streamMessages, chatMode);
        setInputValue('');
    }

    const getPlaceholderText = () => {
        if (chatMode === ChatType.ASK) {
            return 'Ask a question about your project...';
        }
        return t(transKeys.editor.panels.edit.tabs.chat.input.placeholder);
    };

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
            const compressedImage = await compressImageInBrowser(file);
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

    const handleScreenshot = async () => {
        try {
            const framesWithViews = editorEngine.frames.getAll().filter(f => !!f.view);

            if (framesWithViews.length === 0) {
                toast.error('No active frame available for screenshot');
                return;
            }

            let screenshotData = null;
            let mimeType = 'image/jpeg';

            for (const frame of framesWithViews) {
                try {
                    if (!frame.view?.captureScreenshot) {
                        continue;
                    }

                    const result = await frame.view.captureScreenshot();
                    if (result && result.data) {
                        screenshotData = result.data;
                        mimeType = result.mimeType || 'image/jpeg';
                        break;
                    }
                } catch (frameError) {
                    // Continue to next frame on error
                }
            }

            if (!screenshotData) {
                toast.error('Failed to capture screenshot. Please refresh the page and try again.');
                return;
            }

            const contextImage: ImageMessageContext = {
                type: MessageContextType.IMAGE,
                content: screenshotData,
                mimeType: mimeType,
                displayName: 'Screenshot',
            };
            editorEngine.chat.context.context.push(contextImage);
            toast.success('Screenshot added to chat');
        } catch (error) {
            toast.error('Failed to capture screenshot. Please try again.');
        }
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
                    placeholder={getPlaceholderText()}
                    className={cn(
                        'bg-transparent dark:bg-transparent mt-2 overflow-auto max-h-32 text-small p-0 border-0 focus-visible:ring-0 shadow-none rounded-none caret-[#FA003C] resize-none',
                        'selection:bg-[#FA003C]/30 selection:text-[#FA003C] text-foreground-primary placeholder:text-foreground-primary/50 cursor-text',
                        isDragging ? 'pointer-events-none' : 'pointer-events-auto',
                    )}
                    rows={3}
                    value={inputValue}
                    onChange={(e) => {
                        const value = e.target.value;
                        setInputValue(value);
                        // Call handleInput to process @ menu logic
                        handleInput(e);
                    }}
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
                <div className="flex flex-row items-center gap-1.5">
                    <ChatModeToggle
                        chatMode={chatMode}
                        onChatModeChange={setChatMode}
                        disabled={disabled}
                    />
                </div>
                <div className="flex flex-row items-center gap-1.5">
                    <ActionButtons
                        disabled={disabled}
                        handleImageEvent={handleImageEvent}
                        handleScreenshot={handleScreenshot}
                    />
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
                            disabled={inputEmpty || disabled}
                            onClick={sendMessage}
                        >
                            <Icons.ArrowRight />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
});
