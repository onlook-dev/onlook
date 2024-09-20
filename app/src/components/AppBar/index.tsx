import { useRouteManager } from '@/components/Context';
import { Route } from '@/lib/routes';
import { DiscordLogoIcon, GitHubLogoIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { Button } from '../ui/button';
import UpdateButton from './UpdateButton';
import { Links } from '/common/constants';

const AppBar = observer(() => {
    const routeManager = useRouteManager();
    return (
        <div
            className={`flex flex-row items-center pl-20 h-10 ${routeManager.route === Route.SIGN_IN ? 'bg-transparent' : 'bg-bg-active border-b'}`}
        >
            <div className="appbar w-full h-full"></div>
            <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                    window.open(Links.DISCORD, '_blank');
                }}
            >
                <DiscordLogoIcon />
            </Button>
            <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                    window.open(Links.GITHUB, '_blank');
                }}
            >
                <GitHubLogoIcon />
            </Button>
            <div className="flex mr-2 gap-2">
                <div className="flex ml-1 rounded-sm bg-gradient-to-r p-[1px] from-[#6EE7B7] via-[#3B82F6] to-[#9333EA]">
                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        className="h-6 relative bg-black text-white rounded-sm"
                        onClick={() => {
                            window.open(Links.OPEN_ISSUE, '_blank');
                        }}
                    >
                        Report Issue
                    </Button>
                </div>
                <UpdateButton />
            </div>
        </div>
    );
});

export default AppBar;
