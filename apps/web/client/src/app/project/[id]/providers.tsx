'use client';

import { EditorEngineProvider } from '@/components/store/editor';
import { ChatProvider } from './_hooks/use-chat';

export const ProjectProviders = ({ children, projectId }: { children: React.ReactNode, projectId: string }) => {
    return (
        <EditorEngineProvider projectId={projectId}>
            <ChatProvider>{children}</ChatProvider>
        </EditorEngineProvider>
    );
};