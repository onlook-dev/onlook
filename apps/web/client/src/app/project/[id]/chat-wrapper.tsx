'use client';

import { ChatProvider } from './_hooks/use-chat';

export function ChatWrapper({ children }: { children: React.ReactNode }) {
    return (
        <ChatProvider>
            {children}
        </ChatProvider>
    );
}

