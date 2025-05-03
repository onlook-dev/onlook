// import { AuthManager } from '@/lib/auth';
// import { AppStateManager } from '@/lib/state';
import { createContext, useContext } from 'react';
import { EditorEngine } from './editor/engine';
import { ProjectManager } from './project';
import { UserManager } from './user';

const projectManager = new ProjectManager();
const userManager = new UserManager();
const editorEngine = new EditorEngine(
    projectManager,
    userManager
);

const ProjectContext = createContext(projectManager);
const UserContext = createContext(userManager);
const EditorEngineContext = createContext(editorEngine);

export const useProjectManager = () => useContext(ProjectContext);
export const useUserManager = () => useContext(UserContext);
export const useEditorEngine = () => useContext(EditorEngineContext);


// TODO: Likely deprecated
// const authManager = new AuthManager();
// const appStateManager = new AppStateManager();
// const AuthContext = createContext(authManager);
// const AppStateContext = createContext(appStateManager);

// export const useAuthManager = () => useContext(AuthContext);
// export const useRouteManager = () => useContext(RouteContext);
// export const useUpdateManager = () => useContext(UpdateContext);
// export const useAppStateManager = () => useContext(AppStateContext);
