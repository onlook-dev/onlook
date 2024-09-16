import { Route } from '@/lib/routes';
import { observer } from 'mobx-react-lite';
import ProjectEditor from './project';
import RouteProvider, { useRouteManager } from './Provider';

const Routes = observer(() => {
    const routeManager = useRouteManager();

    function renderRoutes() {
        switch (routeManager.route) {
            case Route.EDITOR:
                return <ProjectEditor />;
            case Route.LOGIN:
                return <div>Login</div>;
            default:
                return <div>404: Unknown route</div>;
        }
    }

    return <RouteProvider>{renderRoutes()}</RouteProvider>;
});

export default Routes;
