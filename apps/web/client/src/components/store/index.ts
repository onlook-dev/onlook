import { createContext, useContext } from 'react';
import { EditorEngine } from './editor';
import { ProjectManager } from './project';
import { UserManager } from './user';
import { ProjectsManager } from './projects';

const projectManager = new ProjectManager();
const userManager = new UserManager();
const editorEngine = new EditorEngine(projectManager, userManager);
const projectsManager = new ProjectsManager();
const ProjectContext = createContext(projectManager);
const UserContext = createContext(userManager);
const EditorEngineContext = createContext(editorEngine);
const ProjectsContext = createContext(projectsManager);

export const useUserManager = () => useContext(UserContext);
export const useEditorEngine = () => useContext(EditorEngineContext);
export const useProjectManager = () => useContext(ProjectContext);
export const useProjectsManager = () => useContext(ProjectsContext);
