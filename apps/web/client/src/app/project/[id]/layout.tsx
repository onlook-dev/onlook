'use client';

import { useEditorEngine } from "@/components/store/editor";
import { useProjectManager } from "@/components/store/project";
import { useEffect } from "react";
import { ChatProvider } from './_hooks/use-chat';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    const editorEngine = useEditorEngine();
    const projectManager = useProjectManager();

    useEffect(() => {
        return () => {
            projectManager.clear()
            editorEngine.clear();
        };
    }, []);

    return <ChatProvider>{children}</ChatProvider>;
}