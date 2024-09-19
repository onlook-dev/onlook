import iconLogo from '@/assets/icon-logo.svg';
import { useRouteManager } from '@/components/Context/Route';
import { Button } from '@/components/ui/button';
import { Route } from '@/lib/routes';

function ProjectSelect() {
    const routeManager = useRouteManager();
    return (
        <div className="mx-2 flex flex-row items-center text-xs text-text gap-2">
            <Button
                variant={'ghost'}
                className="mx-0 px-0 text-text text-xs hover:text-text-active"
                onClick={() => (routeManager.route = Route.PROJECTS)}
            >
                <img src={iconLogo} className="w-5 h-5 mr-2" alt="Google logo" />
                {'Onlook'}
            </Button>
            <p>{'/'}</p>
            <Button variant={'ghost'} className="mx-0 px-0 text-text text-xs hover:text-text">
                {'Your Project'}
            </Button>
        </div>
    );
}

export default ProjectSelect;
