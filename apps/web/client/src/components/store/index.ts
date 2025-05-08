import { createContext, useContext } from 'react';
import { EditorEngine } from './editor';
import { ProjectManager } from './project';
import { ProjectsManager } from './projects';
import { UserManager } from './user';

const projectsManager = new ProjectsManager();
const projectManager = new ProjectManager();
const userManager = new UserManager();
const editorEngine = new EditorEngine(projectManager, userManager);

const ProjectsContext = createContext(projectsManager);
const ProjectContext = createContext(projectManager);
const UserContext = createContext(userManager);
const EditorEngineContext = createContext(editorEngine);

export const useUserManager = () => useContext(UserContext);
export const useEditorEngine = () => useContext(EditorEngineContext);
export const useProjectManager = () => useContext(ProjectContext);
export const useProjectsManager = () => useContext(ProjectsContext);
