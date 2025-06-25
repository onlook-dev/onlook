'use client';

import { useEditorEngine } from '@/components/store/editor';
import { useProjectManager } from '@/components/store/project';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ChatProvider } from './_hooks/use-chat';

const isProjectRoute = (href: string | URL): boolean => {
    try {
        const url = typeof href === 'string' ? new URL(href, window.location.origin) : href;
        return url.pathname.startsWith('/project/');
    } catch {
        // Fallback for relative paths
        const path = typeof href === 'string' ? href : href.toString();
        return path.startsWith('/project/');
    }
};

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
            if (!isProjectRoute(href)) {
                projectManager.clear();
                editorEngine.clear();
            }
            return originalPush.call(router, href, options);
        };

        router.replace = (href, options) => {
            if (!isProjectRoute(href)) {
                projectManager.clear();
                editorEngine.clear();
            }
            return originalReplace.call(router, href, options);
        };

        return () => {
            router.push = originalPush;
            router.replace = originalReplace;
        };
    }, [router, projectManager, editorEngine, isProjectRoute]);

    return <ChatProvider>{children}</ChatProvider>;
}
