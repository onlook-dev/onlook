'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { EditorEngine } from './engine';

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
    const editorEngine = useMemo(() => new EditorEngine(projectId), [projectId]);

    useEffect(() => {
        // Always inject preload script in development after hot reload
        if (process.env.NODE_ENV === 'development') {
            editorEngine.preloadScript.injectPreloadScript();
        }
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
