import { DiscordLogoIcon, GitHubLogoIcon } from '@radix-ui/react-icons';
import { Button } from '../ui/button';
import { Links } from '/common/constants';

function AppBar() {
    return (
        <div className={`flex flex-row items-center pl-20 border-b h-10 bg-bg-active`}>
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
            <div className="flex ml-1 mr-2 rounded-sm bg-gradient-to-r p-[1px] from-[#6EE7B7] via-[#3B82F6] to-[#9333EA]">
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
        </div>
    );
}

export default AppBar;
