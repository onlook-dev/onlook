'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import type { ChatMessage, ImageMessageContext, QueuedMessage } from '@onlook/models';
import { ChatType } from '@onlook/models';
import { MessageContextType } from '@onlook/models/chat';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { Textarea } from '@onlook/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { compressImageInBrowser, convertToBase64DataUrl } from '@onlook/utility';

import type { SendMessage } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { FOCUS_CHAT_INPUT_EVENT } from '@/components/store/editor/chat';
import { transKeys } from '@/i18n/keys';
import { validateImageLimit } from '../context-pills/helpers';
import { InputContextPills } from '../context-pills/input-context-pills';
import { type SuggestionsRef } from '../suggestions';
import { ActionButtons } from './action-buttons';
import { ChatContextWindow } from './chat-context';
import { ChatModeToggle } from './chat-mode-toggle';
import { QueueItems } from './queue-items';

interface ChatInputProps {
    messages: ChatMessage[];
    isStreaming: boolean;
    onStop: () => Promise<void>;
    onSendMessage: SendMessage;
    queuedMessages: QueuedMessage[];
    removeFromQueue: (id: string) => void;
}

const imageDragDataSchema = z.object({
    type: z.literal('image'),
    originPath: z.string(),
    fileName: z.string(),
    mimeType: z.string(),
});

export const ChatInput = observer(
    ({
        messages,
        isStreaming,
        onStop,
        onSendMessage,
        queuedMessages,
        removeFromQueue,
    }: ChatInputProps) => {
        const editorEngine = useEditorEngine();
        const t = useTranslations();
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const [isComposing, setIsComposing] = useState(false);
        const [actionTooltipOpen, setActionTooltipOpen] = useState(false);
        const [isDragging, setIsDragging] = useState(false);
        const chatMode = editorEngine.state.chatMode;
        const [inputValue, setInputValue] = useState('');
        const lastUsageMessage = useMemo(
            () => messages.findLast((msg) => msg.metadata?.usage),
            [messages],
        );

        const focusInput = () => {
            requestAnimationFrame(() => {
                textareaRef.current?.focus();
            });
        };

        useEffect(() => {
            if (textareaRef.current && !isStreaming) {
                focusInput();
            }
        }, [isStreaming, messages]);

        useEffect(() => {
            const focusHandler = () => {
                if (textareaRef.current && !isStreaming) {
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
                    void sendMessage();
                }
            }
        };

        async function sendMessage() {
            if (inputEmpty) {
                console.warn('Empty message');
                return;
            }
            const savedInput = inputValue.trim();
            try {
                await onSendMessage(savedInput, chatMode);
                setInputValue('');
            } catch (error) {
                console.error('Error sending message', error);
                toast.error('Failed to send message. Please try again.');
                setInputValue(savedInput);
            }
        }

        const getPlaceholderText = () => {
            if (chatMode === ChatType.ASK) {
                return 'Ask a question about your project...';
            }
            return t(transKeys.editor.panels.edit.tabs.chat.input.placeholder);
        };

        const extractImageFiles = (items: DataTransferItemList | DataTransferItem[]): File[] => {
            return Array.from(items)
                .filter((item) => item.type.startsWith('image/'))
                .map((item) => item.getAsFile())
                .filter((file): file is File => file !== null);
        };

        const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
            const imageFiles = extractImageFiles(e.clipboardData.items);
            if (imageFiles.length > 0) {
                e.preventDefault();
                void handleImageEvents(imageFiles, 'Pasted image');
            }
        };

        const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);
            e.currentTarget.removeAttribute('data-dragging-image');

            // First, check for internal drag-and-drop from image panel
            const jsonData = e.dataTransfer.getData('application/json');
            if (jsonData) {
                try {
                    const parsedData = JSON.parse(jsonData);
                    const result = imageDragDataSchema.safeParse(parsedData);

                    if (result.success) {
                        const data = result.data;
                        const currentImages = editorEngine.chat.context.context.filter(
                            (c) => c.type === MessageContextType.IMAGE,
                        );
                        const { success, errorMessage } = validateImageLimit(currentImages, 1);
                        if (!success) {
                            toast.error(errorMessage);
                            return;
                        }

                        // Load the actual image file content
                        const branchData = editorEngine.branches.getBranchDataById(
                            editorEngine.branches.activeBranch.id,
                        );
                        if (!branchData) {
                            toast.error('Failed to get branch data');
                            return;
                        }

                        const fileContent = await branchData.codeEditor.readFile(data.originPath);
                        if (!fileContent) {
                            toast.error('Failed to load image file');
                            return;
                        }

                        // Convert to base64 data URL
                        const base64Content = convertToBase64DataUrl(fileContent, data.mimeType);

                        const imageContext: ImageMessageContext = {
                            type: MessageContextType.IMAGE,
                            source: 'local',
                            path: data.originPath,
                            branchId: editorEngine.branches.activeBranch.id,
                            content: base64Content,
                            displayName: data.fileName,
                            mimeType: data.mimeType,
                        };
                        editorEngine.chat.context.addContexts([imageContext]);
                        toast.success('Image added to chat');
                        return;
                    }
                } catch (error) {
                    console.error('Failed to parse drag data:', error);
                }
            }

            // Fall back to handling external file drops
            const imageFiles = extractImageFiles(e.dataTransfer.items);
            if (imageFiles.length > 0) {
                void handleImageEvents(imageFiles);
            }
        };

        const processImageFile = async (file: File): Promise<string> => {
            const compressedImage = await compressImageInBrowser(file);
            if (compressedImage) {
                return compressedImage;
            }

            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target?.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        };

        const handleImageEvents = async (files: File[], customDisplayName?: string) => {
            const currentImages = editorEngine.chat.context.context.filter(
                (c) => c.type === MessageContextType.IMAGE,
            );
            const { success, errorMessage } = validateImageLimit(currentImages, files.length);
            if (!success) {
                toast.error(errorMessage);
                return;
            }

            const imageContexts: ImageMessageContext[] = [];

            for (const file of files) {
                try {
                    const base64URL = await processImageFile(file);
                    const contextImage: ImageMessageContext = {
                        id: uuidv4(),
                        type: MessageContextType.IMAGE,
                        source: 'external',
                        content: base64URL,
                        mimeType: file.type,
                        displayName:
                            customDisplayName && files.length === 1 ? customDisplayName : file.name,
                    };
                    imageContexts.push(contextImage);
                } catch (error) {
                    console.error(`Failed to process image ${file.name}:`, error);
                    toast.error(`Failed to process image: ${file.name}`);
                }
            }

            if (imageContexts.length > 0) {
                editorEngine.chat.context.addContexts(imageContexts);
                if (imageContexts.length > 1) {
                    toast.success(`Added ${imageContexts.length} images to chat`);
                }
            }
        };

        const handleImageEvent = async (file: File, displayName?: string) => {
            await handleImageEvents([file], displayName);
        };

        const handleScreenshot = async () => {
            try {
                const currentImages = editorEngine.chat.context.context.filter(
                    (c) => c.type === MessageContextType.IMAGE,
                );

                const { success, errorMessage } = validateImageLimit(currentImages, 1);
                if (!success) {
                    throw new Error(errorMessage);
                }

                const framesWithViews = editorEngine.frames.getAll().filter((f) => !!f.view);

                if (framesWithViews.length === 0) {
                    throw new Error('No active frame available for screenshot');
                }

                let screenshotData = null;
                let mimeType = 'image/jpeg';

                for (const frame of framesWithViews) {
                    try {
                        if (!frame.view?.captureScreenshot) {
                            continue;
                        }

                        const result = await frame.view.captureScreenshot();
                        if (result?.data) {
                            screenshotData = result.data;
                            mimeType = result.mimeType || 'image/jpeg';
                            break;
                        }
                    } catch (frameError) {
                        // Continue to next frame on error
                    }
                }

                if (!screenshotData) {
                    throw new Error('No screenshot data');
                }

                const contextImage: ImageMessageContext = {
                    id: uuidv4(),
                    type: MessageContextType.IMAGE,
                    source: 'external',
                    content: screenshotData,
                    mimeType: mimeType,
                    displayName: 'Screenshot',
                };
                editorEngine.chat.context.addContexts([contextImage]);
                toast.success('Screenshot added to chat');
            } catch (error) {
                toast.error('Failed to capture screenshot. Error: ' + error);
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
                        item.type === 'application/json' || // Internal drag from image panel
                        (item.type === 'Files' && e.dataTransfer.types.includes('public.file-url')),
                );
            if (hasImage) {
                setIsDragging(isDragging);
                e.currentTarget.setAttribute('data-dragging-image', isDragging.toString());
            }
        };

        const suggestionRef = useRef<SuggestionsRef>(null);

        const handleChatModeChange = (mode: ChatType) => {
            editorEngine.state.chatMode = mode;
        };

        return (
            <div
                className={cn(
                    'text-foreground-tertiary text-small flex w-full flex-col border-t transition-colors duration-200 [&[data-dragging-image=true]]:bg-teal-500/40',
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
                <div className="flex w-full flex-col p-2">
                    <QueueItems queuedMessages={queuedMessages} removeFromQueue={removeFromQueue} />
                    <InputContextPills />
                    <Textarea
                        ref={textareaRef}
                        placeholder={getPlaceholderText()}
                        className={cn(
                            'text-small mt-1 max-h-32 resize-none overflow-auto rounded-none border-0 bg-transparent p-2 caret-[#FA003C] shadow-none focus-visible:ring-0 dark:bg-transparent',
                            'text-foreground-primary placeholder:text-foreground-primary/50 cursor-text selection:bg-[#FA003C]/30 selection:text-[#FA003C]',
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
                    />
                </div>
                <div className="flex w-full flex-row justify-between px-2 pt-2 pb-2">
                    <div className="flex flex-row items-center gap-1.5">
                        <ChatModeToggle
                            chatMode={chatMode}
                            onChatModeChange={handleChatModeChange}
                        />
                        {lastUsageMessage?.metadata?.usage && (
                            <ChatContextWindow usage={lastUsageMessage?.metadata?.usage} />
                        )}
                    </div>
                    <div className="flex flex-row items-center gap-1.5">
                        <ActionButtons
                            handleImageEvent={handleImageEvent}
                            handleScreenshot={handleScreenshot}
                        />
                        {isStreaming && inputEmpty ? (
                            <Tooltip open={actionTooltipOpen} onOpenChange={setActionTooltipOpen}>
                                <TooltipTrigger asChild>
                                    <Button
                                        size={'icon'}
                                        variant={'secondary'}
                                        className="text-smallPlus text-primary bg-background-primary h-full w-fit rounded-full px-2.5 py-0.5"
                                        onClick={() => {
                                            setActionTooltipOpen(false);
                                            void onStop();
                                        }}
                                    >
                                        <Icons.Stop />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={6} hideArrow>
                                    {'Stop response'}
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <Button
                                size={'icon'}
                                variant={'secondary'}
                                className={cn(
                                    'text-smallPlus h-full w-fit rounded-full px-2.5 py-0.5',
                                    inputEmpty
                                        ? 'text-primary'
                                        : chatMode === ChatType.ASK
                                            ? 'text-background bg-blue-300 hover:bg-blue-600'
                                            : 'bg-foreground-primary text-background hover:bg-foreground-primary/80',
                                )}
                                disabled={inputEmpty}
                                onClick={() => void sendMessage()}
                            >
                                <Icons.ArrowRight />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    },
);
