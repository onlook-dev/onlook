'use client';

import type { Branch, Project } from '@onlook/models';
import { usePostHog } from 'posthog-js/react';
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { EditorEngine } from './engine';

const EditorEngineContext = createContext<EditorEngine | null>(null);

export const useEditorEngine = () => {
    const ctx = useContext(EditorEngineContext);
    if (!ctx) throw new Error('useEditorEngine must be inside EditorEngineProvider');
    return ctx;
};

export const EditorEngineProvider = ({
    children,
    project,
    branches
}: {
    children: React.ReactNode,
    project: Project,
    branches: Branch[],
}) => {
    const posthog = usePostHog();
    const engineRef = useRef<EditorEngine | null>(null);
    const projectIdRef = useRef<string | null>(null);
    
    const editorEngine = useMemo(() => {
        // Only create new engine if project ID changed or no engine exists
        if (!engineRef.current || projectIdRef.current !== project.id) {
            // Clean up previous engine if it exists
            if (engineRef.current) {
                engineRef.current.clear();
            }
            
            // Create EditorEngine and initialize everything immediately
            const engine = new EditorEngine(project.id, posthog);
            
            // Initialize branches immediately
            engine.initializeBranches(branches);
            
            // Initialize all managers
            engine.init();
            
            // Set project metadata
            engine.screenshot.lastScreenshotAt = project.metadata?.previewImg?.updatedAt ?? null;
            
            engineRef.current = engine;
            projectIdRef.current = project.id;
        } else {
            // Update branches if they changed
            engineRef.current.initializeBranches(branches);
        }
        
        return engineRef.current;
    }, [project.id, posthog, branches]);

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
