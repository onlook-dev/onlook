import { DiscordLogoIcon, HomeIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '../ui/button';
import FeedbackDialog from './FeedbackDialog';
import { Links } from '/common/constants';

function AppBar() {
    const squareClass = `flex items-center justify-center hover:bg-stone-900 h-10 w-12`;
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
            <FeedbackDialog />
        </div>
    );
}

export default AppBar;
