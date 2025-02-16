import { useRouteManager, useUpdateManager } from '@/components/Context';
import { Route } from '@/lib/routes';
import { invokeMainChannel } from '@/lib/utils';
import { Links, MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useTheme } from '../ThemeProvider';
import { HotKeyLabel } from '../ui/hotkeys-label';
import UpdateButton from './UpdateButton';
import { WindowsControls } from './WindowsControls';
import { Hotkey } from '/common/hotkeys';

const AppBar = observer(() => {
    const routeManager = useRouteManager();
    const updateManager = useUpdateManager();
    const { theme, nextTheme, setTheme } = useTheme();
    const className = cn(
        updateManager.updateAvailable &&
            'hover:bg-red-800 hover:text-red-100 dark:hover:text-red-100',
    );
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
            
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                            "opacity-50 hover:opacity-100",
                            className
                        )}
                        onClick={() => invokeMainChannel(MainChannels.RELOAD_APP)}
                    >
                        <Icons.Reload className="w-3.5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <HotKeyLabel hotkey={Hotkey.RELOAD_APP} />
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                            "opacity-50 hover:opacity-100",
                            className
                        )}
                        onClick={() => {
                            setTheme(nextTheme);
                        }}
                    >
                        {theme === 'dark' && <Icons.Moon />}
                        {theme === 'light' && <Icons.Sun />}
                        {theme === 'system' && <Icons.Laptop />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Switch to {nextTheme} mode</TooltipContent>
            </Tooltip>
            <div className="flex mr-2 gap-2">
                <UpdateButton />
            </div>
            <WindowsControls />
        </div>
    );
});

export default AppBar;
