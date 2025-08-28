'use client';

import type { Branch, Project } from '@onlook/models';
import { usePostHog } from 'posthog-js/react';
import { createContext, useContext, useEffect, useState } from 'react';
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
    const [editorEngine, setEditorEngine] = useState<EditorEngine | null>(null);

    // Create or recreate engine when project changes
    useEffect(() => {
        const engine = new EditorEngine(project.id, posthog);

        // Initialize branches immediately
        engine.initializeBranches(branches);

        // Initialize all managers
        engine.init();

        // Set project metadata
        engine.screenshot.lastScreenshotAt = project.metadata?.previewImg?.updatedAt ?? null;

        setEditorEngine(prevEngine => {
            // Clean up previous engine if it exists
            if (prevEngine) {
                prevEngine.clear();
            }
            return engine;
        });

        // Cleanup function - runs when project.id changes or component unmounts
        return () => {
            engine.clear();
        };
    }, [project.id, posthog]);

    // Update branches when they change (but same project)
    useEffect(() => {
        if (editorEngine) {
            editorEngine.initializeBranches(branches);
        }
    }, [branches, editorEngine]);

    if (!editorEngine) {
        return null; // or a loading state
    }

    return (
        <EditorEngineContext.Provider value={editorEngine}>
            {children}
        </EditorEngineContext.Provider>
    );
};
