// import { AuthManager } from '@/lib/auth';
// import { AppStateManager } from '@/lib/state';
import { createContext, useContext } from 'react';
import { EditorEngine } from './editor/engine';
import { ProjectManager } from './projects';
import { UserManager } from './user';

// const authManager = new AuthManager();
const projectManager = new ProjectManager();
const userManager = new UserManager();
const editorEngine = new EditorEngine(
    // projectsManager, userManager
);
// const appStateManager = new AppStateManager();

// projectsManager.editorEngine = editorEngine;

// const AuthContext = createContext(authManager);
const ProjectContext = createContext(projectManager);
const UserContext = createContext(userManager);
const EditorEngineContext = createContext(editorEngine);
// const AppStateContext = createContext(appStateManager);

// export const useAuthManager = () => useContext(AuthContext);
// export const useRouteManager = () => useContext(RouteContext);
// export const useUpdateManager = () => useContext(UpdateContext);
export const useProjectsManager = () => useContext(ProjectContext);
export const useUserManager = () => useContext(UserContext);
export const useEditorEngine = () => useContext(EditorEngineContext);
// export const useAppStateManager = () => useContext(AppStateContext);
