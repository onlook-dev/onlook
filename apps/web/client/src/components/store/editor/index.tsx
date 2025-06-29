import { createContext, useContext, useEffect, useMemo } from 'react';
import { EditorEngine } from './engine';

const EditorEngineContext = createContext<EditorEngine | null>(null);

export const useEditorEngine = () => {
    const ctx = useContext(EditorEngineContext);
    if (!ctx) throw new Error('useEditorEngine must be inside EditorEngineProvider');
    return ctx;
};

export const EditorEngineProvider = ({ children, projectId, userId }: {
    children: React.ReactNode,
    projectId: string,
    userId: string,
}) => {
    const editorEngine = useMemo(() => new EditorEngine(projectId, userId), [projectId, userId]);

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
