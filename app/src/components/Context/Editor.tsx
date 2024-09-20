import { EditorEngine } from '@/lib/editor/engine';
import { ProjectsManager } from '@/lib/projects';
import { createContext, useContext } from 'react';

const projectsManager = new ProjectsManager();
const editorEngine = new EditorEngine(projectsManager);

const ProjectsContext = createContext(projectsManager);
const EditorEngineContext = createContext(editorEngine);

export const useProjectsManager = () => useContext(ProjectsContext);
export const useEditorEngine = () => useContext(EditorEngineContext);
