import { useAuthManager } from '@/components/Context/Auth';
import { useRouteManager } from '@/components/Context/Route';
import { Route } from '@/lib/routes';
import { observer } from 'mobx-react-lite';
import ProjectEditor from './editor';
import Projects from './projects';
import SignIn from './signin';

const Routes = observer(() => {
    const routeManager = useRouteManager();
    const authManager = useAuthManager();

    if (authManager.authenticated && routeManager.route === Route.SIGN_IN) {
        routeManager.route = Route.EDITOR;
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
