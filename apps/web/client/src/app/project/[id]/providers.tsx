'use client';

import { EditorEngineProvider } from '@/components/store/editor';
import { HostingProvider } from '@/components/store/hosting';
import { ChatProvider } from './_hooks/use-chat';

export const ProjectProviders = ({ children, projectId }: { children: React.ReactNode, projectId: string }) => {
    return (
        <EditorEngineProvider projectId={projectId}>
            <HostingProvider>
                <ChatProvider>{children}</ChatProvider>
            </HostingProvider>
        </EditorEngineProvider>
    );
};