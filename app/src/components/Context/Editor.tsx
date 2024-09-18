import { EditorEngine } from '@/lib/editor/engine';
import { createContext, useContext } from 'react';

const EditorEngineContext = createContext(new EditorEngine());
export const useEditorEngine = () => useContext(EditorEngineContext);
