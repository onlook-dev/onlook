import { AuthManager } from '@/lib/auth';
import { EditorEngine } from '@/lib/editor/engine';
import { ProjectsManager } from '@/lib/projects';
import { RequirementsManager } from '@/lib/requirements';
import { RouteManager } from '@/lib/routing';
import { UpdateManager } from '@/lib/update';
import { UserManager } from '@/lib/user';
import { createContext, useContext } from 'react';

const authManager = new AuthManager();
const routeManager = new RouteManager();
const projectsManager = new ProjectsManager();
const updateManager = new UpdateManager();
const requirementsManager = new RequirementsManager();
const userManager = new UserManager();
const editorEngine = new EditorEngine(projectsManager);

const AuthContext = createContext(authManager);
const RouteContext = createContext(routeManager);
const ProjectsContext = createContext(projectsManager);
const UpdateContext = createContext(updateManager);
const RequirementsContext = createContext(requirementsManager);
const UserContext = createContext(userManager);
const EditorEngineContext = createContext(editorEngine);

export const useAuthManager = () => useContext(AuthContext);
export const useRouteManager = () => useContext(RouteContext);
export const useProjectsManager = () => useContext(ProjectsContext);
export const useUpdateManager = () => useContext(UpdateContext);
export const useRequirementsManager = () => useContext(RequirementsContext);
export const useUserManager = () => useContext(UserContext);
export const useEditorEngine = () => useContext(EditorEngineContext);
