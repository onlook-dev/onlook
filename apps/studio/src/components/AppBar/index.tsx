import { useRouteManager, useUpdateManager } from '@/components/Context';
import { Route } from '@/lib/routes';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { HelpButton } from './HelpButton';
import UpdateButton from './UpdateButton';
import { WindowsControls } from './WindowsControls';

export const AppBar = observer(() => {
    const routeManager = useRouteManager();
    const updateManager = useUpdateManager();

    return (
        <div
            className={cn(
                'flex flex-row items-center pl-20 h-10 border-b bg-background dark:bg-background-active transition-colors duration-300 ease-in-out',
                routeManager.route === Route.SIGN_IN && 'bg-transparent border-b-0',
                updateManager.updateAvailable &&
                    'bg-red-950 dark:bg-red-950 dark:text-red-300 text-red-300 transition-opacity duration-300 ease-in-out',
            )}
        >
            <div className="appbar w-full h-full"></div>
            <div className="flex mr-2 gap-2">
                <UpdateButton />
            </div>
            <HelpButton />
            <WindowsControls />
        </div>
    );
});
