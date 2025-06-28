import { createContext, useContext } from 'react';
import { projectManager } from '../project';
import { EditorEngine } from './engine';

const EditorEngineContext = createContext<EditorEngine | null>(null);

export const useEditorEngine = () => {
    const ctx = useContext(EditorEngineContext);
    if (!ctx) throw new Error('useEditorEngine must be inside EditorEngineProvider');
    return ctx;
};

export const EditorEngineProvider = ({ children }: {
    children: React.ReactNode,
}) => {
    const editorEngine = new EditorEngine(projectManager);
    return (
        <EditorEngineContext.Provider value={editorEngine} >
            {children}
        </EditorEngineContext.Provider>
    );
};
