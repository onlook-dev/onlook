'use client';

import { EditorEngineProvider } from '@/components/store/editor';
import { HostingProvider } from '@/components/store/hosting';
import type { Branch, Project } from '@onlook/models';
import { ChatProvider } from './_hooks/use-chat';

export const ProjectProviders = ({
    children,
    projectId,
    project,
    branches
}: {
    children: React.ReactNode,
    projectId: string,
    project: Project,
    branches: Branch[]
}) => {
    return (
        <EditorEngineProvider project={project} branches={branches}>
            <HostingProvider>
                <ChatProvider>
                    {children}
                </ChatProvider>
            </HostingProvider>
        </EditorEngineProvider>
    );
};