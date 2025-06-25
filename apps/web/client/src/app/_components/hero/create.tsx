'use client';

import { useAuthContext } from '@/app/auth/auth-context';
import { DraftImagePill } from '@/app/project/[id]/_components/right-panel/chat-tab/context-pills/draft-image-pill';
import { useCreateManager } from '@/components/store/create';
import { userManager } from '@/components/store/user';
import { MessageContextType, type ImageMessageContext } from '@onlook/models/chat';
import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardHeader } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { Textarea } from '@onlook/ui/textarea';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { compressImageInBrowser } from '@onlook/utility';
import { AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { useEffect, useRef, useState } from 'react';

export function Create({ cardKey }: { cardKey: number }) {
    const createManager = useCreateManager();
    const router = useRouter();
    const posthog = usePostHog();
    const imageRef = useRef<HTMLInputElement>(null);

    const { setIsAuthModalOpen } = useAuthContext();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [inputValue, setInputValue] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [selectedImages, setSelectedImages] = useState<ImageMessageContext[]>([]);
    const [imageTooltipOpen, setImageTooltipOpen] = useState(false);
    const [isHandlingFile, setIsHandlingFile] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const isInputInvalid = !inputValue || inputValue.trim().length < 10;
    const [isComposing, setIsComposing] = useState(false);

    // Restore draft from localStorage if exists
    useEffect(() => {
        const draft = localStorage.getItem('createProjectDraft');
        if (draft && !!userManager.user?.id) {
            try {
                const { prompt, images, timestamp } = JSON.parse(draft);
                // Only restore if draft is less than 1 hour old
                if (Date.now() - timestamp < 3600000) {
                    setInputValue(prompt);
                    setSelectedImages(images);
                }
                // Clear the draft after restoring
                localStorage.removeItem('createProjectDraft');
                // Run the submit function
                createProject(prompt, images);
            } catch (error) {
                console.error('Error restoring draft:', error);
                localStorage.removeItem('createProjectDraft');
            }
        }
    }, []);


    const handleSubmit = async () => {
        if (isInputInvalid) {
            console.warn('Input is too short');
            return;
        }
        createProject(inputValue, selectedImages);
    };

    const createProject = async (prompt: string, images: ImageMessageContext[]) => {
        posthog.capture('user_create_project', {
            prompt,
        });
        if (!userManager.user?.id) {
            console.error('No user ID found');

            // Store the current input and images in localStorage
            localStorage.setItem('createProjectDraft', JSON.stringify({
                prompt,
                images,
                timestamp: Date.now()
            }));
            // Store the return URL
            localStorage.setItem('returnUrl', window.location.pathname);
            // Open the auth modal
            setIsAuthModalOpen(true);
            return;
        }

        setIsLoading(true);
        try {
            const project = await createManager.startCreate(userManager.user?.id, prompt, images);
            if (!project) {
                throw new Error('Failed to create project: No project returned');
            }
            router.push(`/project/${project.id}`);
        } catch (error) {
            console.error('Error creating project:', error);
            toast.error('Failed to create project', {
                description: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setImageTooltipOpen(false);
        // Find and reset the container's data attribute
        const container = e.currentTarget.closest('.bg-background-secondary');
        if (container) {
            container.setAttribute('data-dragging-image', 'false');
        }
        const files = Array.from(e.dataTransfer.files);
        handleNewImageFiles(files);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsHandlingFile(true);
        setImageTooltipOpen(false);
        const files = Array.from(e.target.files || []);
        handleNewImageFiles(files);
    };

    const handleNewImageFiles = async (files: File[]) => {
        const imageFiles = files.filter((file) => file.type.startsWith('image/'));

        const imageContexts: ImageMessageContext[] = [];
        if (imageFiles.length > 0) {
            // Handle the dropped image files
            for (const file of imageFiles) {
                const imageContext = await createImageMessageContext(file);
                if (imageContext) {
                    imageContexts.push(imageContext);
                }
            }
        }
        setSelectedImages([...selectedImages, ...imageContexts]);
        setIsHandlingFile(false);
    };

    const handleRemoveImage = (imageContext: ImageMessageContext) => {
        if (imageRef && imageRef.current) {
            imageRef.current.value = '';
        }
        setSelectedImages(selectedImages.filter((f) => f !== imageContext));
    };

    const createImageMessageContext = async (file: File): Promise<ImageMessageContext | null> => {
        try {
            const compressedImage = await compressImageInBrowser(file);

            // If compression failed, fall back to original file
            const base64 =
                compressedImage ||
                (await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result as string);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                }));

            return {
                type: MessageContextType.IMAGE,
                content: base64,
                displayName: file.name,
                mimeType: file.type,
            };
        } catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
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
            // Find the container div with the bg-background-secondary class
            const container = e.currentTarget.closest('.bg-background-secondary');
            if (container) {
                container.setAttribute('data-dragging-image', isDragging.toString());
            }
        }
    };

    const handleContainerClick = (e: React.MouseEvent) => {
        // Don't focus if clicking on a button, pill, or the textarea itself
        if (
            e.target instanceof Element &&
            (e.target.closest('button') ||
                e.target.closest('.group') || // Pills have 'group' class
                e.target === textareaRef.current)
        ) {
            return;
        }

        textareaRef.current?.focus();
    };

    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            // Reset height to auto to get the correct scrollHeight
            textareaRef.current.style.height = 'auto';

            const lineHeight = 20; // Approximate line height in pixels
            const maxHeight = lineHeight * 10; // 10 lines maximum

            const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
            textareaRef.current.style.height = `${newHeight}px`;
        }
    };

    return (
        <Card
            key={cardKey}
            className={cn(
                'w-[600px] overflow-hidden gap-4 backdrop-blur-md bg-background/20',
                isDragging && 'bg-background/40',
            )}
        >
            <CardHeader className="text-start">{`Let's design a...`}</CardHeader>
            <CardContent>
                <div
                    className={cn(
                        'flex flex-col gap-3 rounded p-0 transition-colors duration-200 cursor-text',
                        'backdrop-blur-sm bg-background-secondary/80',
                        '[&[data-dragging-image=true]]:bg-teal-500/40',
                        isDragging && 'bg-teal-500/40 cursor-copy',
                    )}
                    onClick={handleContainerClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div
                        className={`flex flex-col w-full ${selectedImages.length > 0 ? 'p-4' : 'px-2 pt-1'}`}
                    >
                        <div
                            className={cn(
                                'flex flex-row flex-wrap w-full gap-1.5 text-micro text-foreground-secondary',
                                selectedImages.length > 0 ? 'min-h-6' : 'h-0',
                            )}
                        >
                            <AnimatePresence mode="popLayout">
                                {selectedImages.map((imageContext) => (
                                    <DraftImagePill
                                        key={imageContext.content}
                                        context={imageContext}
                                        onRemove={() => handleRemoveImage(imageContext)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                        <div className="relative flex items-center w-full mt-1">
                            <Textarea
                                ref={textareaRef}
                                className={cn(
                                    'overflow-auto min-h-[60px] text-small border-0 shadow-none rounded-none caret-[#FA003C]',
                                    'selection:bg-[#FA003C]/30 selection:text-[#FA003C] text-foreground-primary',
                                    'cursor-text placeholder:text-foreground-primary/50',
                                    'transition-[height] duration-300 ease-in-out bg-transparent dark:bg-transparent focus-visible:ring-0 ',
                                )}
                                placeholder="Paste a link, imagery, or more as inspiration"
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    adjustTextareaHeight();
                                }}
                                onCompositionStart={() => setIsComposing(true)}
                                onCompositionEnd={(e) => {
                                    setIsComposing(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                                onDragEnter={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDragStateChange(true, e);
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDragStateChange(true, e);
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                        handleDragStateChange(false, e);
                                    }
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDragStateChange(false, e);
                                    handleDrop(e);
                                }}
                                rows={3}
                                style={{ resize: 'none' }}
                            />
                        </div>
                        <div className="flex flex-row w-full justify-between items-center pt-2 pb-2 px-0">
                            <div className="flex flex-row justify-start gap-1.5">
                                <Tooltip
                                    open={imageTooltipOpen && !isHandlingFile}
                                    onOpenChange={(open) =>
                                        !isHandlingFile && setImageTooltipOpen(open)
                                    }
                                >
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-9 h-9 text-foreground-tertiary group hover:bg-transparent cursor-pointer"
                                            onClick={() =>
                                                document.getElementById('image-input')?.click()
                                            }
                                        >
                                            <input
                                                id="image-input"
                                                type="file"
                                                ref={imageRef}
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={handleFileSelect}
                                            />
                                            <Icons.Image
                                                className={cn(
                                                    'w-5 h-5',
                                                    'group-hover:text-foreground',
                                                )}
                                            />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipPortal>
                                        <TooltipContent side="top" sideOffset={5}>
                                            Upload image
                                        </TooltipContent>
                                    </TooltipPortal>
                                </Tooltip>
                            </div>
                            <Button
                                size="icon"
                                variant="secondary"
                                className={cn(
                                    'text-smallPlus w-9 h-9 cursor-pointer',
                                    isInputInvalid
                                        ? 'text-foreground-primary'
                                        : 'bg-foreground-primary text-white hover:bg-foreground-hover',
                                )}
                                disabled={isInputInvalid || isLoading}
                                onClick={handleSubmit}
                            >
                                {isLoading ? (
                                    <Icons.LoadingSpinner className="w-5 h-5 animate-pulse text-background" />
                                ) : (
                                    <Icons.ArrowRight
                                        className={cn(
                                            'w-5 h-5',
                                            !isInputInvalid
                                                ? 'text-background'
                                                : 'text-foreground-primary',
                                        )}
                                    />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}