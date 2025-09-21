'use client';

import type { Branch, Project } from '@onlook/models';
import { usePostHog } from 'posthog-js/react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
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
    const currentProjectId = useRef(project.id);
    const engineRef = useRef<EditorEngine | null>(null);

    const [editorEngine, setEditorEngine] = useState(() => {
        const engine = new EditorEngine(project.id, posthog);
        engine.initBranches(branches);
        engine.init();
        engine.screenshot.lastScreenshotAt = project.metadata?.previewImg?.updatedAt ?? null;
        engineRef.current = engine;
        return engine;
    });

    // Initialize editor engine when project ID changes
    useEffect(() => {
        const initializeEngine = async () => {
            if (currentProjectId.current !== project.id) {
                // Clean up old engine with delay to avoid race conditions
                if (engineRef.current) {
                    setTimeout(() => engineRef.current?.clear(), 0);
                }

                // Create new engine for new project
                const newEngine = new EditorEngine(project.id, posthog);
                await newEngine.initBranches(branches);
                await newEngine.init();
                newEngine.screenshot.lastScreenshotAt = project.metadata?.previewImg?.updatedAt ?? null;

                engineRef.current = newEngine;
                setEditorEngine(newEngine);
                currentProjectId.current = project.id;
            }
        };

        initializeEngine();
    }, [project.id]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            setTimeout(() => engineRef.current?.clear(), 0);
        };
    }, []);

    return (
        <EditorEngineContext.Provider value={editorEngine}>
            {children}
        </EditorEngineContext.Provider>
    );
};
