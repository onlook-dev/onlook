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
import React, { useState } from 'react';

interface EmailCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface FormData {
    name: string;
    email: string;
}

export function EmailCaptureModal({ isOpen, onClose }: EmailCaptureModalProps) {
    const [formData, setFormData] = useState<FormData>({ name: '', email: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                setFormData({ name: '', email: '' });
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
            setFormData({ name: '', email: '' });
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

                        {error && (
                            <div className="text-sm text-red-500 text-center">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1"
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
