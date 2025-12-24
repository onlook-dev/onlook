'use client';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Input } from '@onlook/ui/input';
import { motion } from 'motion/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface FormData {
    name: string;
    email: string;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_term: string;
    utm_content: string;
}

// Constants for better maintainability
const MEASUREMENT_DELAY = 100; // ms - delay for DOM measurement
const SUCCESS_TIMEOUT = 7000; // ms - how long to show success message

export function MobileEmailCapture() {
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [containerHeight, setContainerHeight] = useState<number>(140); // Increased default height for notification
    const notificationRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const emailInputRef = useRef<HTMLInputElement>(null);
    const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const measurementTimerRef = useRef<NodeJS.Timeout | null>(null);
    const resizeTimerRef = useRef<NodeJS.Timeout | null>(null);
    const initialUtmsRef = useRef<{
        utm_source: string;
        utm_medium: string;
        utm_campaign: string;
        utm_term: string;
        utm_content: string;
    } | null>(null);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && initialUtmsRef.current === null) {
            const urlParams = new URLSearchParams(window.location.search);
            const utmValues = {
                utm_source: urlParams.get('utm_source') || '',
                utm_medium: urlParams.get('utm_medium') || '',
                utm_campaign: urlParams.get('utm_campaign') || '',
                utm_term: urlParams.get('utm_term') || '',
                utm_content: urlParams.get('utm_content') || ''
            };

            // Cache initial UTM values for the entire session
            initialUtmsRef.current = utmValues;

            setFormData(prev => ({
                ...prev,
                ...utmValues
            }));
        }
    }, []);

    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    // Email validation function
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    };

    // Handle Enter key press in name field
    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            emailInputRef.current?.focus();
        }
    };

    // Handle Enter key press in email field
    const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (isValidEmail(formData.email) && formData.name.trim()) {
                handleSubmit(e);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.email.trim()) {
            setError('Please fill in all fields');
            return;
        }

        if (!isValidEmail(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch('/api/email-capture', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    email: formData.email.trim(),
                    utm_source: formData.utm_source,
                    utm_medium: formData.utm_medium,
                    utm_campaign: formData.utm_campaign,
                    utm_term: formData.utm_term,
                    utm_content: formData.utm_content,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Server error (${response.status})`);
            }

            setShowSuccess(true);
            successTimeoutRef.current = setTimeout(() => {
                setShowSuccess(false);
                setFormData({
                    name: '',
                    email: '',
                    // Restore UTM values from initial cache instead of clearing
                    ...(initialUtmsRef.current || {
                        utm_source: '',
                        utm_medium: '',
                        utm_campaign: '',
                        utm_term: '',
                        utm_content: ''
                    })
                });
                setShowEmailForm(false);
                successTimeoutRef.current = null;
            }, SUCCESS_TIMEOUT);

        } catch (error) {
            console.error('Failed to submit email capture form:', error);

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    setError('Request timed out. Please check your connection and try again.');
                } else if (error.message.includes('Server error')) {
                    setError('Server error. Please try again in a moment.');
                } else if (error.message.includes('Failed to fetch')) {
                    setError('Network error. Please check your connection and try again.');
                } else {
                    setError('Failed to submit form. Please try again.');
                }
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const measureAndSetHeight = useCallback(() => {
        try {
            if (showEmailForm && formRef.current) {
                const height = formRef.current.scrollHeight;
                // Add extra padding when error is present to ensure error message is visible
                const extraPadding = 32;
                setContainerHeight(Math.max(height + extraPadding, 100));
            } else if (!showEmailForm && notificationRef.current) {
                const height = notificationRef.current.scrollHeight;
                setContainerHeight(Math.max(height + 32, 100)); // Add padding and ensure minimum height
            }
        } catch (error) {
            console.warn('Failed to measure container height:', error);
            // Fallback to default height if measurement fails
            setContainerHeight(140);
        }
    }, [showEmailForm, error]);

    // Debounced measurement function to prevent race conditions
    const debouncedMeasurement = useCallback(() => {
        // Clear any existing measurement timer
        if (measurementTimerRef.current) {
            clearTimeout(measurementTimerRef.current);
        }

        measurementTimerRef.current = setTimeout(() => {
            measureAndSetHeight();
            measurementTimerRef.current = null;
        }, MEASUREMENT_DELAY);
    }, [measureAndSetHeight]);

    // Measure height whenever showEmailForm or error changes
    useEffect(() => {
        debouncedMeasurement();
    }, [debouncedMeasurement]);

    // Also measure on window resize
    useEffect(() => {
        const handleResize = () => {
            // Clear any existing resize timer
            if (resizeTimerRef.current) {
                clearTimeout(resizeTimerRef.current);
            }

            resizeTimerRef.current = setTimeout(() => {
                measureAndSetHeight();
                resizeTimerRef.current = null;
            }, MEASUREMENT_DELAY);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeTimerRef.current) {
                clearTimeout(resizeTimerRef.current);
                resizeTimerRef.current = null;
            }
        };
    }, [measureAndSetHeight]);

    // Cleanup all timers on unmount
    useEffect(() => {
        return () => {
            if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current);
                successTimeoutRef.current = null;
            }
            if (measurementTimerRef.current) {
                clearTimeout(measurementTimerRef.current);
                measurementTimerRef.current = null;
            }
            if (resizeTimerRef.current) {
                clearTimeout(resizeTimerRef.current);
                resizeTimerRef.current = null;
            }
        };
    }, []);

    // Focus the name input when form opens
    useEffect(() => {
        if (showEmailForm && nameInputRef.current) {
            const timer = setTimeout(() => {
                nameInputRef.current?.focus();
            }, 100); // Small delay to ensure the form is fully rendered
            return () => clearTimeout(timer);
        }
    }, [showEmailForm]);

    const handleShowEmailForm = () => {
        setShowEmailForm(true);
    };

    const handleClose = () => {
        if (!isSubmitting) {
            // Clear all timers if they exist
            if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current);
                successTimeoutRef.current = null;
            }
            if (measurementTimerRef.current) {
                clearTimeout(measurementTimerRef.current);
                measurementTimerRef.current = null;
            }
            if (resizeTimerRef.current) {
                clearTimeout(resizeTimerRef.current);
                resizeTimerRef.current = null;
            }

            setFormData({
                name: '',
                email: '',
                // Restore UTM values from initial cache instead of clearing
                ...(initialUtmsRef.current || {
                    utm_source: '',
                    utm_medium: '',
                    utm_campaign: '',
                    utm_term: '',
                    utm_content: ''
                })
            });
            setError(null);
            setShowSuccess(false);
            setShowEmailForm(false);
        }
    };

    return (
        <motion.div
            className="sm:hidden text-balance flex flex-col gap-3 items-center relative z-20 mx-4 xs:mx-6 text-foreground-secondary bg-foreground-secondary/10 backdrop-blur-lg rounded-lg border-[0.5px] border-foreground-secondary/20 p-3 xs:p-4 w-full max-w-[calc(100vw-2rem)] xs:max-w-sm select-none"
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{
                opacity: 1,
                filter: "blur(0px)",
                height: containerHeight
            }}
            transition={{
                duration: 0.6,
                delay: 0.6,
                ease: "easeOut",
                height: { duration: 0.4, ease: "easeInOut" }
            }}
            style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
        >
            {!showEmailForm ? (
                <motion.div
                    key="notification"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex flex-col gap-3 items-center w-full"
                    ref={notificationRef}
                >
                    <div className="text-center text-base xs:text-lg font-light my-2 text-foreground-secondary px-2">
                        Onlook is optimized for larger screens
                    </div>
                    <Button
                        size="sm"
                        onClick={handleShowEmailForm}
                        className="bg-foreground-primary text-background-primary w-full hover:bg-foreground-hover hover:text-background-primary h-auto py-3 text-base xs:text-lg whitespace-normal leading-tight"
                    >
                        Email me a link for later
                    </Button>
                </motion.div>
            ) : (
                <motion.div
                    key="email-form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex flex-col gap-3 items-center w-full"
                    ref={formRef}
                >
                    {showSuccess ? (
                        <motion.div
                            className="flex flex-col items-center justify-center gap-3 py-6"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            layout
                            layoutId="success-content"
                        >
                            <Icons.Check className="size-8" />
                            <div className="text-foreground-secondary text-base xs:text-lg font-light w-full px-2">
                                Thanks, an email to use Onlook has been sent to you!
                            </div>
                        </motion.div>
                    ) : (
                        <>
                            <div className="text-left text-foreground-secondary text-sm xs:text-base font-light w-full px-1">
                                <h3 className="text-sm xs:text-base font-medium text-foreground-primary break-words">
                                    Email me a link to Onlook
                                </h3>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-2 w-full">
                                <div className="space-y-1 text-left">
                                    <label htmlFor="name" className="text-xs text-foreground-secondary">
                                        Name
                                    </label>
                                    <Input
                                        ref={nameInputRef}
                                        id="name"
                                        type="text"
                                        placeholder="Pablo Picasso"
                                        value={formData.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        onKeyDown={handleNameKeyDown}
                                        disabled={isSubmitting}
                                        required
                                        className="bg-background-primary/50 border-foreground-secondary/20 text-sm h-9 xs:h-10 text-foreground-primary focus:ring-0 focus-visible:ring-0 !ring-0 focus:border-foreground-primary select-text w-full"
                                    />
                                </div>

                                <div className="space-y-1 text-left">
                                    <label htmlFor="email" className="text-xs text-foreground-secondary">
                                        Email
                                    </label>
                                    <Input
                                        ref={emailInputRef}
                                        id="email"
                                        type="email"
                                        placeholder="Enter your email"
                                        value={formData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        onKeyDown={handleEmailKeyDown}
                                        disabled={isSubmitting}
                                        required
                                        className="bg-background-primary/50 border-foreground-secondary/20 text-sm h-9 xs:h-10 text-foreground-primary focus:ring-0 focus-visible:ring-0 !ring-0 focus:border-foreground-primary select-text w-full"
                                    />
                                </div>

                                {/* Hidden UTM parameter fields */}
                                <input type="hidden" name="utm_source" value={formData.utm_source} />
                                <input type="hidden" name="utm_medium" value={formData.utm_medium} />
                                <input type="hidden" name="utm_campaign" value={formData.utm_campaign} />
                                <input type="hidden" name="utm_term" value={formData.utm_term} />
                                <input type="hidden" name="utm_content" value={formData.utm_content} />

                                {error && (
                                    <motion.div
                                        className="text-sm text-red-500 text-center"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <div className="pt-1 flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleClose}
                                        disabled={isSubmitting}
                                        className="border-foreground-secondary/20 text-foreground-secondary hover:bg-foreground-secondary/10 h-9 xs:h-10 w-9 xs:w-10 rounded-md p-0 flex-shrink-0"
                                    >
                                        <Icons.CrossL className="w-3 xs:w-4 h-3 xs:h-4" />
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting || !formData.name.trim() || !isValidEmail(formData.email)}
                                        className="flex-1 bg-foreground-primary text-background-primary hover:bg-foreground-hover hover:text-background-primary h-9 xs:h-10 text-xs xs:text-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
                                    >
                                        <span className="truncate">
                                            {isSubmitting ? 'Submitting...' : 'Email me a link'}
                                        </span>
                                    </Button>
                                </div>
                            </form>
                        </>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
}
