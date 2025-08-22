'use client';

import { Button } from '@onlook/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@onlook/ui/dialog';
import { Input } from '@onlook/ui/input';
import React, { useState, useEffect } from 'react';

interface EmailCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface FormData {
    name: string;
    email: string;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_term: string;
    utm_content: string;
}

export function EmailCaptureModal({ isOpen, onClose }: EmailCaptureModalProps) {
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
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            setFormData(prev => ({
                ...prev,
                utm_source: urlParams.get('utm_source') || '',
                utm_medium: urlParams.get('utm_medium') || '',
                utm_campaign: urlParams.get('utm_campaign') || '',
                utm_term: urlParams.get('utm_term') || '',
                utm_content: urlParams.get('utm_content') || ''
            }));
        }
    }, []);

    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim() || !formData.email.trim()) {
            setError('Please fill in all fields');
            return;
        }

        if (!formData.email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const url = new URL('https://n8n.process.onlook.com/webhook/website-landing-form');
            url.searchParams.append('name', formData.name.trim());
            url.searchParams.append('email', formData.email.trim());
            
            if (formData.utm_source) url.searchParams.append('utm_source', formData.utm_source);
            if (formData.utm_medium) url.searchParams.append('utm_medium', formData.utm_medium);
            if (formData.utm_campaign) url.searchParams.append('utm_campaign', formData.utm_campaign);
            if (formData.utm_term) url.searchParams.append('utm_term', formData.utm_term);
            if (formData.utm_content) url.searchParams.append('utm_content', formData.utm_content);

            const credentials = btoa('alex:Onlook01!');
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                setFormData({ 
                    name: '', 
                    email: '', 
                    utm_source: '',
                    utm_medium: '',
                    utm_campaign: '',
                    utm_term: '',
                    utm_content: ''
                });
                onClose();
            }, 2000);

        } catch (error) {
            console.error('Failed to submit email capture form:', error);
            setError('Failed to submit form. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setFormData({ 
                name: '', 
                email: '', 
                utm_source: '',
                utm_medium: '',
                utm_campaign: '',
                utm_term: '',
                utm_content: ''
            });
            setError(null);
            setShowSuccess(false);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Get Onlook for Desktop</DialogTitle>
                    <DialogDescription>
                        We'll send you a link to use Onlook on your computer
                    </DialogDescription>
                </DialogHeader>
                
                {showSuccess ? (
                    <div className="flex flex-col items-center gap-4 py-6">
                        <div className="text-center text-foreground">
                            Thanks, an email to use onlook has been sent to you
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">
                                Name
                            </label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Enter your name"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                Email
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>

                        {/* Hidden UTM parameter fields */}
                        <input type="hidden" name="utm_source" value={formData.utm_source} />
                        <input type="hidden" name="utm_medium" value={formData.utm_medium} />
                        <input type="hidden" name="utm_campaign" value={formData.utm_campaign} />
                        <input type="hidden" name="utm_term" value={formData.utm_term} />
                        <input type="hidden" name="utm_content" value={formData.utm_content} />

                        {error && (
                            <div className="text-sm text-red-500 text-center">
                                {error}
                            </div>
                        )}

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-foreground-primary text-background-primary hover:bg-foreground-hover hover:text-background-primary"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit'}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
