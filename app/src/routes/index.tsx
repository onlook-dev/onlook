import { useRouteManager } from '@/components/RouteProvider';
import { Route } from '@/lib/routes';
import { observer } from 'mobx-react-lite';
import ProjectEditor from './editor';
import Login from './login';
import Projects from './projects';

const Routes = observer(() => {
    const routeManager = useRouteManager();

    switch (routeManager.route) {
        case Route.EDITOR:
            return <ProjectEditor />;
        case Route.LOGIN:
            return <Login />;
        case Route.PROJECTS:
            return <Projects />;
        default:
            return <div>404: Unknown route</div>;
    }
});

export default Routes;
