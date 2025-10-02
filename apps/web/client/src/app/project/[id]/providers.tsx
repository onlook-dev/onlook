'use client';

import { EditorEngineProvider } from '@/components/store/editor';
import { HostingProvider } from '@/components/store/hosting';
import { PresenceProvider } from '@/components/store/presence';
import type { Branch, Project } from '@onlook/models';

export const ProjectProviders = ({
    children,
    project,
    branches
}: {
    children: React.ReactNode,
    project: Project,
    branches: Branch[]
}) => {
    return (
        <EditorEngineProvider project={project} branches={branches}>
            <HostingProvider>
                <PresenceProvider>
                    {children}
                </PresenceProvider>
            </HostingProvider>
        </EditorEngineProvider>
    );
};