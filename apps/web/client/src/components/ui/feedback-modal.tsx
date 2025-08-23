"use client";

import { useStateManager } from '@/components/store/state';
import { api } from '@/trpc/react';
import type { FeedbackSubmitInput } from '@onlook/db';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { Textarea } from '@onlook/ui/textarea';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const FeedbackModal = observer(() => {
    const stateManager = useStateManager();
    const { data: user } = api.user.get.useQuery();
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
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
            if (typeof window !== 'undefined') {
                setPageUrl(window.location.href);
                setUserAgent(navigator.userAgent);
            }
        }
    }, [stateManager.isFeedbackModalOpen, user?.email]);

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
                        className="relative bg-background border border-border rounded-2xl max-w-md w-full shadow-2xl"
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

                                <div className="flex items-center gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        disabled={isSubmitting || !message.trim()}
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
                                    <div className="mt-1">
                                        Use <kbd className="px-1 py-0.5 text-xs bg-secondary rounded">Cmd+Enter</kbd> to send
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