'use client';

import { useEditorEngine } from '@/components/store/editor';
import { useProjectManager } from '@/components/store/project';
import { useEffect } from 'react';
import { ChatProvider } from './_hooks/use-chat';
import { useSubscriptionCleanup } from '@/hooks/use-subscription-cleanup';


export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    const editorEngine = useEditorEngine();
    const projectManager = useProjectManager();
    const { addSubscription } = useSubscriptionCleanup();

    // Register cleanup function that will be called on pathname changes and beforeunload
    useEffect(() => {
        addSubscription(() => {
            projectManager.clear();
            editorEngine.clear();
        });
    }, [projectManager, editorEngine, addSubscription]);

    return <ChatProvider>{children}</ChatProvider>;
}