"use client";

import { useStateManager } from '@/components/store/state';
import { api } from '@/trpc/react';
import {
    formatFileSize,
    uploadFeedbackAttachments,
    validateFiles,
    type AttachmentFile
} from '@/utils/upload/feedback-attachments';
import {
    canCompressFile,
    compressMultipleImages,
    getCompressionOptions,
    type CompressionResult
} from '@/utils/upload/image-compression';
import type { FeedbackSubmitInput } from '@onlook/db';
import { Links } from '@onlook/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { Textarea } from '@onlook/ui/textarea';
import { AnimatePresence, motion } from 'framer-motion';
import localforage from 'localforage';
import { observer } from 'mobx-react-lite';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const FEEDBACK_DRAFT_KEY = 'feedbackDraft';

interface FeedbackFormState {
    message: string;
    email: string;
    attachments: AttachmentFile[];
    timestamp: number;
}

export const FeedbackModal = observer(() => {
    const stateManager = useStateManager();
    const { data: user } = api.user.get.useQuery();
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isCompressing, setIsCompressing] = useState(false);
    const [compressionProgress, setCompressionProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pathname = usePathname();

    const { mutateAsync: submitFeedback } = api.feedback.submit.useMutation();

    // Auto-capture page URL and user agent
    const [pageUrl, setPageUrl] = useState('');
    const [userAgent, setUserAgent] = useState('');

    // Form persistence functions
    const saveFormState = useCallback(async () => {
        if (!message.trim() && !email.trim() && attachments.length === 0) {
            // Don't save empty forms
            return;
        }

        const formState: FeedbackFormState = {
            message,
            email,
            attachments,
            timestamp: Date.now(),
        };

        try {
            await localforage.setItem(FEEDBACK_DRAFT_KEY, formState);
        } catch (error) {
            console.error('Failed to save feedback draft:', error);
        }
    }, [message, email, attachments]);

    const restoreFormState = useCallback(async () => {
        try {
            const savedState = await localforage.getItem<FeedbackFormState>(FEEDBACK_DRAFT_KEY);

            if (savedState) {
                // Only restore if the draft is less than 24 hours old
                const dayInMs = 24 * 60 * 60 * 1000;
                const isExpired = Date.now() - savedState.timestamp > dayInMs;

                if (!isExpired) {
                    setMessage(savedState.message);
                    setEmail(savedState.email || user?.email || '');
                    setAttachments(savedState.attachments);

                    if (savedState.message || savedState.attachments.length > 0) {
                        toast.info('Draft restored', {
                            description: 'Your previous feedback draft has been restored.',
                        });
                    }
                } else {
                    // Clean up expired draft
                    await localforage.removeItem(FEEDBACK_DRAFT_KEY);
                }
            }
        } catch (error) {
            console.error('Failed to restore feedback draft:', error);
        }
    }, [user?.email]);

    const clearFormState = useCallback(async () => {
        try {
            await localforage.removeItem(FEEDBACK_DRAFT_KEY);
        } catch (error) {
            console.error('Failed to clear feedback draft:', error);
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPageUrl(window.location.href);
            setUserAgent(navigator.userAgent);
        }
    }, []);

    // Handle modal open/close and form restoration
    useEffect(() => {
        if (stateManager.isFeedbackModalOpen) {
            // Reset form state first
            setMessage('');
            setEmail(user?.email || '');
            setAttachments([]);
            setIsUploading(false);
            setUploadProgress(0);
            setIsCompressing(false);
            setCompressionProgress(0);

            if (typeof window !== 'undefined') {
                setPageUrl(window.location.href);
                setUserAgent(navigator.userAgent);
            }

            // Then try to restore draft
            restoreFormState();
        }
    }, [stateManager.isFeedbackModalOpen, user?.email, restoreFormState]);

    // Auto-save form state when form changes (debounced)
    useEffect(() => {
        if (!stateManager.isFeedbackModalOpen) return;

        const timeoutId = setTimeout(() => {
            saveFormState();
        }, 1000); // Save after 1 second of inactivity

        return () => clearTimeout(timeoutId);
    }, [message, email, attachments, stateManager.isFeedbackModalOpen, saveFormState]);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const fileArray = Array.from(files);

        // Validate files
        const validation = validateFiles(fileArray);
        if (!validation.isValid) {
            toast.error('Invalid files', {
                description: validation.errors.join(', ')
            });
            return;
        }

        // Show warnings if any
        if (validation.warnings.length > 0) {
            validation.warnings.forEach(warning => {
                toast.info('File optimization', {
                    description: warning,
                });
            });
        }

        let processedFiles = fileArray;

        // Compress images if needed
        if (validation.needsCompression) {
            setIsCompressing(true);
            setCompressionProgress(0);

            try {
                // Compress each image with smart options based on file size
                const compressionResults: CompressionResult[] = [];
                for (let i = 0; i < fileArray.length; i++) {
                    const file = fileArray[i];
                    if (!file) continue;

                    if (canCompressFile(file)) {
                        const options = getCompressionOptions(file);
                        const result = await compressMultipleImages(
                            [file],
                            options,
                            (fileIndex, fileProgress, totalProgress) => {
                                const overallProgress = ((i + totalProgress / 100) / fileArray.length) * 100;
                                setCompressionProgress(overallProgress);
                            }
                        );
                        compressionResults.push(...result);
                    } else {
                        // Non-compressible files pass through unchanged
                        compressionResults.push({
                            file,
                            originalSize: file.size,
                            compressedSize: file.size,
                            compressionRatio: 0,
                        });
                        setCompressionProgress(((i + 1) / fileArray.length) * 100);
                    }
                }

                // Replace original files with compressed versions
                processedFiles = compressionResults.map(result => result.file);

                // Show compression summary
                const compressedImages = compressionResults.filter(r => r.compressionRatio > 0);
                if (compressedImages.length > 0) {
                    const avgCompression = compressedImages.reduce((sum, r) => sum + r.compressionRatio, 0) / compressedImages.length;
                    toast.success('Images optimized', {
                        description: `${compressedImages.length} image(s) compressed by ${Math.round(avgCompression)}% on average`,
                    });
                }
            } catch (error) {
                console.error('Compression error:', error);
                toast.error('Compression failed', {
                    description: 'Using original files instead'
                });
                // Continue with original files if compression fails
            } finally {
                setIsCompressing(false);
                setCompressionProgress(0);
            }
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const uploadedFiles = await uploadFeedbackAttachments(
                processedFiles,
                user?.id,
                (progress) => setUploadProgress(progress)
            );

            setAttachments(prev => [...prev, ...uploadedFiles]);
            toast.success(`Uploaded ${uploadedFiles.length} file(s)`);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Upload failed', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message.trim()) {
            toast.error('Please enter your feedback message');
            return;
        }

        if (!user?.email && !email.trim()) {
            toast.error('Please enter your email address');
            return;
        }

        setIsSubmitting(true);

        try {
            const feedbackData: FeedbackSubmitInput = {
                message: message.trim(),
                email: email.trim(),
                pageUrl,
                userAgent,
                attachments,
                metadata: {
                    route: pathname,
                    timestamp: new Date().toISOString(),
                    screenWidth: window.innerWidth,
                    screenHeight: window.innerHeight,
                },
            };

            await submitFeedback(feedbackData);

            // Clear saved draft on successful submission
            await clearFormState();

            toast.success('Thank you for your feedback!', {
                description: 'We\'ll review it and get back to you if needed.',
            });

            stateManager.isFeedbackModalOpen = false;
        } catch (error) {
            console.error('Error submitting feedback:', error);
            const errorMessage = error instanceof Error ? error.message : 'Something went wrong';

            if (errorMessage.includes('TOO_MANY_REQUESTS')) {
                toast.error('Too many feedback submissions', {
                    description: 'Please wait before submitting again.',
                });
            } else {
                toast.error('Failed to submit feedback', {
                    description: errorMessage,
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            stateManager.isFeedbackModalOpen = false;
        }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit(e);
        }
    };

    return (
        <AnimatePresence>
            {stateManager.isFeedbackModalOpen && (
                <motion.div
                    className="fixed inset-0 z-99 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => stateManager.isFeedbackModalOpen = false}
                    onKeyDown={handleKeyDown}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

                    <motion.div
                        className="relative bg-background border border-border rounded-2xl max-w-md w-full shadow-2xl max-h-[80vh] overflow-y-auto"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                    <Icons.MessageSquare className="w-5 h-5" />
                                    Send Feedback
                                </h2>
                                <Button
                                    onClick={() => stateManager.isFeedbackModalOpen = false}
                                    variant="ghost"
                                    size="sm"
                                    className="p-2 rounded-full hover:bg-secondary transition-colors"
                                >
                                    <Icons.CrossS className="w-4 h-4" />
                                </Button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label htmlFor="message" className="text-sm font-medium text-foreground mb-2 block">
                                        Message *
                                    </Label>
                                    <Textarea
                                        id="message"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Tell us what's on your mind, report a bug, or suggest an improvement..."
                                        rows={4}
                                        maxLength={5000}
                                        className="resize-none"
                                        disabled={isSubmitting}
                                    />
                                    <div className="text-xs text-foreground-tertiary mt-1">
                                        {message.length}/5000
                                    </div>
                                </div>

                                {!user?.email && (
                                    <div>
                                        <Label htmlFor="email" className="text-sm font-medium text-foreground mb-2 block">
                                            Email Address *
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your@email.com"
                                            disabled={isSubmitting}
                                        />
                                        <div className="text-xs text-foreground-tertiary mt-1">
                                            We'll only use this to follow up on your feedback if needed
                                        </div>
                                    </div>
                                )}

                                {/* File attachments section */}
                                <div>
                                    <Label className="text-sm font-medium text-foreground mb-2 block">
                                        Attachments (Optional)
                                    </Label>

                                    {/* Upload area */}
                                    <div className="border-2 border-dashed border-border rounded-lg p-4 mb-3">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept="image/*,.pdf,.txt,.json,.zip,.mp4,.webm,.mov"
                                            className="hidden"
                                            onChange={handleFileSelect}
                                            disabled={isUploading || isSubmitting}
                                        />

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading || isSubmitting || isCompressing}
                                            className="w-full h-auto py-3 flex-col gap-2"
                                        >
                                            {isCompressing ? (
                                                <>
                                                    <Icons.LoadingSpinner className="w-5 h-5 animate-spin" />
                                                    <span className="text-sm">Optimizing images... {Math.round(compressionProgress)}%</span>
                                                </>
                                            ) : isUploading ? (
                                                <>
                                                    <Icons.LoadingSpinner className="w-5 h-5 animate-spin" />
                                                    <span className="text-sm">Uploading... {Math.round(uploadProgress)}%</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Icons.Upload className="w-5 h-5" />
                                                    <span className="text-sm">Click to upload files</span>
                                                    <span className="text-xs text-foreground-tertiary">
                                                        Images, PDFs, videos (max 50MB each, 100MB total)
                                                    </span>
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {/* Uploaded files list */}
                                    {attachments.length > 0 && (
                                        <div className="space-y-2">
                                            {attachments.map((attachment, index) => (
                                                <div key={index} className="flex items-center justify-between bg-secondary/50 p-3 rounded-lg">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <Icons.Cube className="w-4 h-4 text-foreground-tertiary shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-foreground truncate">
                                                                {attachment.name}
                                                            </p>
                                                            <p className="text-xs text-foreground-tertiary">
                                                                {formatFileSize(attachment.size)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeAttachment(index)}
                                                        disabled={isSubmitting}
                                                        className="shrink-0 h-8 w-8 p-0"
                                                    >
                                                        <Icons.CrossS className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        disabled={isSubmitting || !message.trim() || isUploading || isCompressing}
                                    >
                                        {isSubmitting ? (
                                            <div className="flex items-center gap-2">
                                                <Icons.LoadingSpinner className="w-4 h-4 animate-spin" />
                                                Sending...
                                            </div>
                                        ) : (
                                            <>
                                                <Icons.ArrowUp className="w-4 h-4 mr-2" />
                                                Send Feedback
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => stateManager.isFeedbackModalOpen = false}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                </div>

                                <div className="text-xs text-foreground-tertiary pt-2 border-t border-border">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <Icons.InfoCircled className="w-3 h-3" />
                                            Your feedback helps us improve Onlook
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs h-auto p-1 text-foreground-tertiary hover:text-foreground-secondary"
                                            onClick={() => window.open(Links.OPEN_ISSUE, '_blank')}
                                        >
                                            Report through GitHub
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});