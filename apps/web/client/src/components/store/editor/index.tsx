import { createContext, useContext } from 'react';
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
    const editorEngine = new EditorEngine(projectId);
    return (
        <EditorEngineContext.Provider value={editorEngine} >
            {children}
        </EditorEngineContext.Provider>
    );
};
