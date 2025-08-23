"use client";

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { useEffect, useState } from 'react';
import { FeedbackModal } from './feedback-modal';

interface FeedbackButtonProps {
    userEmail?: string | null;
    variant?: 'default' | 'outline' | 'ghost' | 'secondary';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    showText?: boolean;
    tooltip?: string;
    className?: string;
}

export function FeedbackButton({ 
    userEmail,
    variant = 'outline',
    size = 'sm',
    showText = false,
    tooltip = 'Send feedback',
    className,
}: FeedbackButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Keyboard shortcut: Cmd/Ctrl + Shift + F
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                setIsModalOpen(true);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const button = (
        <Button
            variant={variant}
            size={size}
            onClick={() => setIsModalOpen(true)}
            className={className}
            aria-label="Send feedback"
        >
            <Icons.MessageSquare className={showText ? "w-4 h-4 mr-2" : "w-4 h-4"} />
            {showText && 'Feedback'}
        </Button>
    );

    return (
        <>
            {tooltip && !showText ? (
                <Tooltip>
                    <TooltipTrigger asChild>
                        {button}
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{tooltip}</p>
                        <div className="text-xs text-foreground-secondary mt-1">
                            ⌘⇧F
                        </div>
                    </TooltipContent>
                </Tooltip>
            ) : (
                button
            )}

            <FeedbackModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                userEmail={userEmail}
            />
        </>
    );
}