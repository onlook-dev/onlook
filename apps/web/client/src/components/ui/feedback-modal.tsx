"use client";

import { useStateManager } from '@/components/store/state';
import { api } from '@/trpc/react';
import {
    formatFileSize,
    uploadFeedbackAttachments,
    validateFiles,
    type AttachmentFile
} from '@/utils/upload/feedback-attachments';
import type { FeedbackSubmitInput } from '@onlook/db';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { Textarea } from '@onlook/ui/textarea';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export const FeedbackModal = observer(() => {
    const stateManager = useStateManager();
    const { data: user } = api.user.get.useQuery();
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pathname = usePathname();

    const { mutateAsync: submitFeedback } = api.feedback.submit.useMutation();

    // Auto-capture page URL and user agent
    const [pageUrl, setPageUrl] = useState('');
    const [userAgent, setUserAgent] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPageUrl(window.location.href);
            setUserAgent(navigator.userAgent);
        }
    }, []);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (stateManager.isFeedbackModalOpen) {
            setMessage('');
            setEmail(user?.email || '');
            setAttachments([]);
            setIsUploading(false);
            setUploadProgress(0);
            if (typeof window !== 'undefined') {
                setPageUrl(window.location.href);
                setUserAgent(navigator.userAgent);
            }
        }
    }, [stateManager.isFeedbackModalOpen, user?.email]);

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

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const uploadedFiles = await uploadFeedbackAttachments(
                fileArray,
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
                                            disabled={isUploading || isSubmitting}
                                            className="w-full h-auto py-3 flex-col gap-2"
                                        >
                                            {isUploading ? (
                                                <>
                                                    <Icons.LoadingSpinner className="w-5 h-5 animate-spin" />
                                                    <span className="text-sm">Uploading... {Math.round(uploadProgress)}%</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Icons.Upload className="w-5 h-5" />
                                                    <span className="text-sm">Click to upload files</span>
                                                    <span className="text-xs text-foreground-tertiary">
                                                        Images, PDFs, videos (max 10MB each, 5 files total)
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
                                        disabled={isSubmitting || !message.trim() || isUploading}
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
                                    <div className="flex items-center gap-1">
                                        <Icons.InfoCircled className="w-3 h-3" />
                                        Your feedback helps us improve Onlook
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