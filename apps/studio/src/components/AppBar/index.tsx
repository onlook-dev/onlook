import { useRouteManager, useUpdateManager } from '@/components/Context';
import { Route } from '@/lib/routes';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Kbd } from '@onlook/ui/kbd';
import { HotKeyLabel } from '../ui/hotkeys-label';
import UpdateButton from './UpdateButton';
import { WindowsControls } from './WindowsControls';
import { Hotkey } from '/common/hotkeys';
import { HotkeysModal } from '../HotkeysModal';

const AppBar = observer(() => {
    const routeManager = useRouteManager();
    const updateManager = useUpdateManager();
    const [showHotkeys, setShowHotkeys] = useState(false);

    useHotkeys(Hotkey.SHOW_HOTKEYS.toString(), () => setShowHotkeys(true), {
        preventDefault: true,
    });
    const className = cn(
        'opacity-50 hover:opacity-100',
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
            <div className="flex mr-2 gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowHotkeys(true)}
                    className="px-2"
                >
                    <Kbd>⌘/</Kbd>
                </Button>
                <UpdateButton />
            </div>
            <WindowsControls />
            <HotkeysModal open={showHotkeys} onOpenChange={setShowHotkeys} />
        </div>
    );
});

export default AppBar;
