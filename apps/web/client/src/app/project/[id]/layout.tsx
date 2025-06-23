'use client';

import { useEditorEngine } from '@/components/store/editor';
import { useProjectManager } from '@/components/store/project';
import { useEffect } from 'react';
import { ChatProvider } from './_hooks/use-chat';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    const editorEngine = useEditorEngine();
    const projectManager = useProjectManager();

    useEffect(() => {
        const handleBeforeUnload = () => {
            projectManager.clear();
            editorEngine.clear();
        };

        // Only cleanup on actual browser navigation/close
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [projectManager, editorEngine]);

    return <ChatProvider>{children}</ChatProvider>;
}