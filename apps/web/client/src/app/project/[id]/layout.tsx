'use client';

import { ChatProvider } from './_hooks/use-chat';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    return <ChatProvider>{children}</ChatProvider>;
}