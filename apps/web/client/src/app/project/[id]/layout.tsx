'use client';

import { useEditorEngine } from '@/components/store/editor';
import { useProjectManager } from '@/components/store/project';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ChatProvider } from './_hooks/use-chat';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    const editorEngine = useEditorEngine();
    const projectManager = useProjectManager();
    const router = useRouter();

    useEffect(() => {
        const handleBeforeUnload = () => {
            projectManager.clear();
            editorEngine.clear();
        };

        // Cleanup when browser tab/window closes
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [projectManager, editorEngine]);

    // Cleanup when navigating away from project route
    useEffect(() => {
        const originalPush = router.push;
        const originalReplace = router.replace;

        router.push = (href, options) => {
            if (!href.toString().includes('/project/')) {
                projectManager.clear();
                editorEngine.clear();
            }
            return originalPush.call(router, href, options);
        };

        router.replace = (href, options) => {
            if (!href.toString().includes('/project/')) {
                projectManager.clear();
                editorEngine.clear();
            }
            return originalReplace.call(router, href, options);
        };

        return () => {
            router.push = originalPush;
            router.replace = originalReplace;
        };
    }, [router, projectManager, editorEngine]);

    return <ChatProvider>{children}</ChatProvider>;
}
