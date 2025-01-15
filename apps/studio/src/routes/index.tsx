import {
    useAuthManager,
    useProjectsManager,
    useRequirementsManager,
    useRouteManager,
} from '@/components/Context';
import { Route } from '@/lib/routing';
import { observer } from 'mobx-react-lite';
import ProjectEditor from './editor';
import Projects from './projects';
import Requirements from './requirements';
import SignIn from './signin';

const Routes = observer(() => {
    const routeManager = useRouteManager();
    const authManager = useAuthManager();
    const reqManager = useRequirementsManager();
    const projectsManager = useProjectsManager();

    if (!authManager.authenticated && authManager.isAuthEnabled) {
        routeManager.route = Route.SIGN_IN;
    } else if (reqManager.loaded && !reqManager.requirementsMet) {
        routeManager.route = Route.REQUIREMENTS;
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
        case Route.REQUIREMENTS:
            return <Requirements />;
        default:
            return <div>404: Unknown route</div>;
    }
});

export default Routes;
