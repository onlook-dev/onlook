import { useAuthManager, useProjectsManager, useRouteManager } from '@/components/Context';
import { Route } from '@/lib/routes';
import { observer } from 'mobx-react-lite';
import ProjectEditor from './editor';
import Projects from './projects';
import SignIn from './signin';
import { AnimatePresence, motion } from 'framer-motion';

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

    // switch (routeManager.route) {
    //     case Route.EDITOR:
    //         return <ProjectEditor />;
    //     case Route.SIGN_IN:
    //         return <SignIn />;
    //     case Route.PROJECTS:
    //         return <Projects />;
    //     default:
    //         return <div>404: Unknown route</div>;
    // }
    return (
        <AnimatePresence mode="wait" initial={false}>
            {routeManager.route === Route.EDITOR && (
                <motion.div
                    key="about"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                        duration: 1,
                    }}
                    exit={{ opacity: 1 }}
                >
                    <ProjectEditor />
                </motion.div>
            )}
            {routeManager.route === Route.SIGN_IN && <SignIn />}
            {routeManager.route === Route.PROJECTS && (
                <motion.div
                    key="projects"
                    transition={{
                        duration: 0.5,
                    }}
                    exit={{ opacity: 100 }}
                >
                    <Projects />
                </motion.div>
            )}
        </AnimatePresence>
    );
});

export default Routes;
