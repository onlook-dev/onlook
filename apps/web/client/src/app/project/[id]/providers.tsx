'use client';

import { EditorEngineProvider } from '@/components/store/editor';
import { HostingProvider } from '@/components/store/hosting';
import { ChatProvider } from './_hooks/use-chat';
import { ChimeNotificationProvider } from './_hooks/use-chime-notification';

export const ProjectProviders = ({ children, projectId }: { children: React.ReactNode, projectId: string }) => {
    return (
        <EditorEngineProvider projectId={projectId}>
            <HostingProvider>
                <ChimeNotificationProvider>
                    <ChatProvider>{children}</ChatProvider>
                </ChimeNotificationProvider>
            </HostingProvider>
        </EditorEngineProvider>
    );
};