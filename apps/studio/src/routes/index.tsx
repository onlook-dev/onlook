import { useAuthManager, useProjectsManager, useRouteManager } from '@/components/Context';
import { Route } from '@/lib/routes';
import { observer } from 'mobx-react-lite';
import ProjectEditor from './editor';
import Projects from './projects';
import SignIn from './signin';

const Routes = observer(() => {
    const routeManager = useRouteManager();
    const authManager = useAuthManager();
    const projectsManager = useProjectsManager();

    if (!authManager.authenticated && authManager.isAuthEnabled) {
        routeManager.route = Route.SIGN_IN;
    } else if (projectsManager.project) {
        routeManager.route = Route.EDITOR;
    } else {
        routeManager.route = Route.PROJECTS;
    }

    switch (routeManager.route) {
        case Route.EDITOR:
            return <ProjectEditor />;
        case Route.SIGN_IN:
            return <SignIn />;
        case Route.PROJECTS:
            return <Projects />;
        default:
            return <div>404: Unknown route</div>;
    }
});

export default Routes;
