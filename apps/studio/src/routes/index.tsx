import { useAuthManager, useProjectsManager, useRouteManager } from '@/components/Context';
import { Route } from '@/lib/routes';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import ProjectEditor from './editor';
import Projects from './projects';
import SignIn from './signin';

const Routes = observer(() => {
    const routeManager = useRouteManager();
    const authManager = useAuthManager();
    const projectsManager = useProjectsManager();
    const [currentRoute, setCurrentRoute] = useState<Route | null>(null);

    useEffect(() => {
        let targetRoute: Route;

        if (!authManager.authenticated && authManager.isAuthEnabled) {
            targetRoute = Route.SIGN_IN;
        } else if (projectsManager.project) {
            targetRoute = Route.EDITOR;
        } else {
            targetRoute = Route.PROJECTS;
        }

        if (targetRoute !== currentRoute && currentRoute !== null) {
            // Only apply transitions after initial render
            if (
                document.startViewTransition &&
                typeof document.startViewTransition === 'function'
            ) {
                document.startViewTransition(() => {
                    routeManager.route = targetRoute;
                    setCurrentRoute(targetRoute);
                    return new Promise((resolve) => {
                        // Allow time for the DOM to update
                        setTimeout(resolve, 0);
                    });
                });
            } else {
                // Fallback for browsers that don't support View Transitions API
                routeManager.route = targetRoute;
                setCurrentRoute(targetRoute);
            }
        } else {
            // Initial render or no change
            routeManager.route = targetRoute;
            setCurrentRoute(targetRoute);
        }
    }, [
        authManager.authenticated,
        authManager.isAuthEnabled,
        projectsManager.project,
        currentRoute,
        routeManager,
    ]);

    // Render the current route
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
