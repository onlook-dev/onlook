import { AuthManager } from '@/lib/auth';
import { EditorEngine } from '@/lib/editor/engine';
import { ProjectsManager } from '@/lib/projects';
import { RouteManager } from '@/lib/routes';
import { UpdateManager } from '@/lib/update';
import { createContext, useContext } from 'react';

const authManager = new AuthManager();
const routeManager = new RouteManager();
const projectsManager = new ProjectsManager();
const editorEngine = new EditorEngine(projectsManager);
const updateManager = new UpdateManager();

const AuthContext = createContext(authManager);
const RouteContext = createContext(routeManager);
const ProjectsContext = createContext(projectsManager);
const EditorEngineContext = createContext(editorEngine);
const UpdateContext = createContext(updateManager);

export const useAuthManager = () => useContext(AuthContext);
export const useRouteManager = () => useContext(RouteContext);
export const useProjectsManager = () => useContext(ProjectsContext);
export const useEditorEngine = () => useContext(EditorEngineContext);
export const useUpdateManager = () => useContext(UpdateContext);
