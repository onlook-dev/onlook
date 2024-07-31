import { DiscordLogoIcon, GitHubLogoIcon, HomeIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '../ui/button';
import { Links } from '/common/constants';

function AppBar() {
    const squareClass = `flex items-center justify-center hover:bg-bg h-10 w-12`;
    return (
        <div className={`flex flex-row items-center pl-20 border-b h-10`}>
            <button className={squareClass}>
                <HomeIcon />
            </button>
            <div
                className={`min-w-40 max-w-52 border border-b-black px-4 text-xs flex items-center h-[41px]`}
            >
                <h1 className="text-bold">Current Tab</h1>
            </div>
            <button className={squareClass}>
                <PlusIcon />
            </button>
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
