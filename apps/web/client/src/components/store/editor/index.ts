'use client';

import { createContext, useContext } from 'react';
import { projectManager } from '../project';
import { userManager } from '../user';
import { EditorEngine } from './engine';

const editorEngine = new EditorEngine(projectManager, userManager);
const EditorEngineContext = createContext(editorEngine);
export const useEditorEngine = () => useContext(EditorEngineContext);
