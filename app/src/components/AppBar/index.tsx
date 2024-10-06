import { useRouteManager, useUpdateManager } from '@/components/Context';
import { Route } from '@/lib/routes';
import { DiscordLogoIcon, GitHubLogoIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import UpdateButton from './UpdateButton';
import { WindowsControls } from './WindowsControls';
import { Links } from '/common/constants';

const AppBar = observer(() => {
    const routeManager = useRouteManager();
    const updateManager = useUpdateManager();

    return (
        <div
            className={clsx(
                'flex flex-row items-center pl-20 h-10 border-b bg-bg-active transition-colors duration-300 ease-in-out',
                routeManager.route === Route.SIGN_IN && 'bg-transparent border-b-0',
                updateManager.updateAvailable &&
                    'bg-red-1000 transition-opacity duration-300 ease-in-out',
            )}
        >
            <div className="appbar w-full h-full"></div>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        size="sm"
                        variant="ghost"
                        className={clsx(updateManager.updateAvailable && 'hover:bg-red-800')}
                        onClick={() => {
                            window.open(Links.DISCORD, '_blank');
                        }}
                    >
                        <DiscordLogoIcon />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Join our Discord</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        size="sm"
                        variant="ghost"
                        className={clsx(updateManager.updateAvailable && 'hover:bg-red-800')}
                        onClick={() => {
                            window.open(Links.GITHUB, '_blank');
                        }}
                    >
                        <GitHubLogoIcon />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Visit our GitHub</TooltipContent>
            </Tooltip>
            <div className="flex mr-2 gap-2">
                <div className="flex ml-1 rounded-sm bg-gradient-to-r p-[1px] from-[#6EE7B7] via-[#3B82F6] to-[#9333EA]">
                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        className="h-[26px] relative bg-black text-white rounded-sm transition-opacity duration-300 ease-in-out"
                        onClick={() => {
                            window.open(Links.OPEN_ISSUE, '_blank');
                        }}
                    >
                        Report Issue
                    </Button>
                </div>
                <UpdateButton />
            </div>
            <WindowsControls />
        </div>
    );
});

export default AppBar;
