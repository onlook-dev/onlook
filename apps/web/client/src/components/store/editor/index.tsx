'use client';

import type { Branch, Project } from '@onlook/models';
import { usePostHog } from 'posthog-js/react';
import { createContext, useContext, useEffect, useMemo } from 'react';
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

    const editorEngine = useMemo(() => {
        // Create EditorEngine and initialize it immediately with branches
        const engine = new EditorEngine(project.id, posthog);

        // Initialize branches immediately
        engine.initializeBranches(branches);

        // Initialize all managers
        engine.init();

        // Set project metadata
        engine.screenshot.lastScreenshotAt = project.metadata.previewImg?.updatedAt ?? null;

        return engine;
    }, [project.id, posthog]);

    // Update branches when they change without recreating the entire engine
    useEffect(() => {
        editorEngine.initializeBranches(branches);
    }, [branches, editorEngine]);

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
