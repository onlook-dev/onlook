import { Route } from '@/lib/routes';
import { observer } from 'mobx-react-lite';
import { useRouteManager } from '../components/RouteProvider';
import Login from './login';
import ProjectEditor from './project';

const Routes = observer(() => {
    const routeManager = useRouteManager();

    switch (routeManager.route) {
        case Route.EDITOR:
            return <ProjectEditor />;
        case Route.LOGIN:
            return <Login />;
        default:
            return <div>404: Unknown route</div>;
    }
});

export default Routes;
