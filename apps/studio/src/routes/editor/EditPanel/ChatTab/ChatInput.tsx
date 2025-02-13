import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { compressImage } from '@/lib/utils';
import type { ChatMessageContext, ImageMessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Textarea } from '@onlook/ui/textarea';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { AnimatePresence } from 'motion/react';
import { useRef, useState } from 'react';
import { DraftContextPill } from './ContextPills/DraftContextPill';
import { DraftImagePill } from './ContextPills/DraftingImagePill';
import { Suggestions } from './Suggestions';

export const ChatInput = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [inputValue, setInputValue] = useState('');
    const [isComposing, setIsComposing] = useState(false);
    const [actionTooltipOpen, setActionTooltipOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [hideSuggestions, setHideSuggestions] = useState(false);

    const disabled = editorEngine.chat.isWaiting || editorEngine.chat.context.context.length === 0;
    const inputEmpty = !inputValue || inputValue.trim().length === 0;

    function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
        if (isComposing) {
            return;
        }
        e.currentTarget.style.height = 'auto';
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (!isComposing && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    function sendMessage() {
        if (inputEmpty) {
            console.warn('Empty message');
            return;
        }
        if (editorEngine.chat.isWaiting) {
            console.warn('Already waiting for response');
            return;
        }
        editorEngine.chat.sendNewMessage(inputValue);
        setInputValue('');
    }

    const handleRemoveContext = (contextToRemove: ChatMessageContext) => {
        const newContext = [...editorEngine.chat.context.context].filter(
            (context) => context !== contextToRemove,
        );

        editorEngine.chat.context.context = newContext;
    };

    const handleOpenFileDialog = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.blur(); // Removes focus from the button to prevent tooltip from showing
        const inputElement = document.createElement('input');
        inputElement.type = 'file';
        inputElement.accept = 'image/*';
        inputElement.onchange = () => {
            if (inputElement.files && inputElement.files.length > 0) {
                const file = inputElement.files[0];
                const fileName = file.name;
                handleImageEvent(file, fileName);
            }
        };
        inputElement.click();
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
            const compressedImage = await compressImage(file);
            const base64URL = compressedImage || (event.target?.result as string);
            const contextImage: ImageMessageContext = {
                type: MessageContextType.IMAGE,
                content: base64URL,
                mimeType: file.type,
                displayName: displayName || file.name,
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

    return (
        <div
            className={cn(
                'flex flex-col w-full text-foreground-tertiary border-t text-small transition-colors duration-200',
                '[&[data-dragging-image=true]]:bg-teal-500/40',
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
                hideSuggestions={hideSuggestions}
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
            />
            <div className="flex flex-col w-full p-4">
                <div
                    className={cn(
                        'flex flex-row flex-wrap w-full gap-1.5 text-micro mb-1 text-foreground-secondary',
                        editorEngine.chat.context.context.length > 0 ? 'min-h-6' : 'h-0',
                    )}
                >
                    <AnimatePresence mode="popLayout">
                        {editorEngine.chat.context.context.map(
                            (context: ChatMessageContext, index: number) => {
                                if (context.type === MessageContextType.IMAGE) {
                                    return (
                                        <DraftImagePill
                                            key={`image-${context.content}`}
                                            context={context}
                                            onRemove={() => handleRemoveContext(context)}
                                        />
                                    );
                                }
                                return (
                                    <DraftContextPill
                                        key={`${context.type}-${context.content}`}
                                        context={context}
                                        onRemove={() => handleRemoveContext(context)}
                                    />
                                );
                            },
                        )}
                    </AnimatePresence>
                </div>
                <Textarea
                    ref={textareaRef}
                    disabled={disabled}
                    placeholder={
                        disabled
                            ? projectsManager.runner?.isRunning ||
                              projectsManager.runner?.isStarting
                                ? 'Select an element to start'
                                : 'Start the project to chat'
                            : 'Ask follow up questions or provide more context...'
                    }
                    className={cn(
                        'mt-2 overflow-auto max-h-24 text-small p-0 border-0 shadow-none rounded-none caret-[#FA003C]',
                        'selection:bg-[#FA003C]/30 selection:text-[#FA003C] text-foreground-primary',
                        'placeholder:text-foreground-primary/50',
                        'cursor-text',
                        isDragging ? 'pointer-events-none' : 'pointer-events-auto',
                    )}
                    rows={3}
                    style={{ resize: 'none' }}
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
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.parentElement?.dispatchEvent(
                            new DragEvent('dragenter', {
                                bubbles: true,
                                cancelable: true,
                                dataTransfer: e.dataTransfer,
                            }),
                        );
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.parentElement?.dispatchEvent(
                            new DragEvent('dragover', {
                                bubbles: true,
                                cancelable: true,
                                dataTransfer: e.dataTransfer,
                            }),
                        );
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            e.currentTarget.parentElement?.dispatchEvent(
                                new DragEvent('dragleave', {
                                    bubbles: true,
                                    cancelable: true,
                                    dataTransfer: e.dataTransfer,
                                }),
                            );
                        }
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.parentElement?.dispatchEvent(
                            new DragEvent('drop', {
                                bubbles: true,
                                cancelable: true,
                                dataTransfer: e.dataTransfer,
                            }),
                        );
                    }}
                />
            </div>
            <div className="flex flex-row w-full justify-between pt-2 pb-2 px-2">
                <div className="flex flex-row justify-start gap-1.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={'ghost'}
                                size={'icon'}
                                className="w-9 h-9 text-foreground-tertiary group hover:bg-transparent"
                                onClick={handleOpenFileDialog}
                                disabled={disabled}
                            >
                                <Icons.Image
                                    className={cn(
                                        'w-5 h-5',
                                        disabled
                                            ? 'text-foreground-tertiary'
                                            : 'group-hover:text-foreground',
                                    )}
                                />
                            </Button>
                        </TooltipTrigger>
                        <TooltipPortal>
                            <TooltipContent side="top" sideOffset={5}>
                                {disabled ? 'Select an element to start' : 'Upload Image Reference'}
                            </TooltipContent>
                        </TooltipPortal>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={'ghost'}
                                size={'icon'}
                                className="w-9 h-9 text-foreground-tertiary group hover:bg-transparent"
                                onClick={() => {
                                    editorEngine.chat.context.addScreenshotContext();
                                }}
                                disabled={disabled}
                            >
                                <Icons.Laptop
                                    className={cn(
                                        'w-5 h-5',
                                        disabled
                                            ? 'text-foreground-tertiary'
                                            : 'group-hover:text-foreground',
                                    )}
                                />
                            </Button>
                        </TooltipTrigger>
                        <TooltipPortal>
                            <TooltipContent side="top" sideOffset={5}>
                                {disabled
                                    ? 'Select an element to start'
                                    : 'Add screenshot of the current page'}
                            </TooltipContent>
                        </TooltipPortal>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={'ghost'}
                                size={'icon'}
                                className={cn(
                                    'w-9 h-9 text-foreground-tertiary group hover:bg-transparent',
                                )}
                                onClick={() => setHideSuggestions(!hideSuggestions)}
                                disabled={disabled}
                            >
                                {!hideSuggestions ? (
                                    <Icons.Lightbulb
                                        className={cn(
                                            'w-5 h-5',
                                            disabled
                                                ? 'text-foreground-tertiary'
                                                : 'group-hover:text-foreground',
                                        )}
                                    />
                                ) : (
                                    <Icons.LightbulbSlash
                                        className={cn(
                                            'w-5 h-5',
                                            disabled
                                                ? 'text-foreground-tertiary'
                                                : 'group-hover:text-foreground',
                                        )}
                                    />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipPortal>
                            <TooltipContent side="top" sideOffset={5}>
                                {disabled ? 'Select an element to start' : 'Toggle Suggestions'}
                            </TooltipContent>
                        </TooltipPortal>
                    </Tooltip>
                    <Button
                        variant={'outline'}
                        className="w-fit h-fit py-0.5 px-2.5 text-foreground-tertiary hidden"
                    >
                        <Icons.FilePlus className="mr-2" />
                        <span className="text-smallPlus">File Reference</span>
                    </Button>
                </div>
                {editorEngine.chat.isWaiting ? (
                    <Tooltip open={actionTooltipOpen} onOpenChange={setActionTooltipOpen}>
                        <TooltipTrigger asChild>
                            <Button
                                size={'icon'}
                                variant={'secondary'}
                                className="text-smallPlus w-fit h-full py-0.5 px-2.5 text-primary"
                                onClick={() => {
                                    setActionTooltipOpen(false);
                                    editorEngine.chat.stopStream();
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
                        disabled={inputEmpty || editorEngine.chat.isWaiting}
                        onClick={sendMessage}
                    >
                        <Icons.ArrowRight />
                    </Button>
                )}
            </div>
        </div>
    );
});
