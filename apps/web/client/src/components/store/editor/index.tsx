'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { EditorEngine } from './engine';
import { usePostHog } from 'posthog-js/react';

const EditorEngineContext = createContext<EditorEngine | null>(null);

export const useEditorEngine = () => {
    const ctx = useContext(EditorEngineContext);
    if (!ctx) throw new Error('useEditorEngine must be inside EditorEngineProvider');
    return ctx;
};

export const EditorEngineProvider = ({ children, projectId }: {
    children: React.ReactNode,
    projectId: string,
}) => {
    const posthog = usePostHog();
    const editorEngine = useMemo(() => new EditorEngine(projectId, posthog), [projectId, posthog]);

    useEffect(() => {
        return () => {
            editorEngine.clear();
        };
    }, [editorEngine]);

    return (
        <EditorEngineContext.Provider value={editorEngine}>
            {children}
        </EditorEngineContext.Provider>
    );
};
