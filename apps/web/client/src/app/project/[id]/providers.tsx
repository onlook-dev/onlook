'use client';

import { EditorEngineProvider } from '@/components/store/editor';
import { ChatProvider } from './_hooks/use-chat';

export const ProjectProviders = ({ children }: { children: React.ReactNode }) => {
    return (
        <EditorEngineProvider>
            <ChatProvider>{children}</ChatProvider>
        </EditorEngineProvider>
    );
};