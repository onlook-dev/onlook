"use client";

import { useAuthContext } from '@/app/auth/auth-context';
import { FeedbackButton } from './feedback-button';

export function FeedbackTrigger() {
    const { user } = useAuthContext();
    
    return (
        <FeedbackButton
            userEmail={user?.email}
            variant="outline"
            size="sm"
            showText={false}
            tooltip="Send feedback (⌘⇧F)"
            className="fixed bottom-4 right-4 z-40 shadow-lg"
        />
    );
}