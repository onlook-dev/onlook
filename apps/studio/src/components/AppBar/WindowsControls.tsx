import { useState } from 'react';
import { CopyIcon, Cross1Icon, MinusIcon } from '@radix-ui/react-icons';
import { Button } from '../ui/button';
import { MainChannels } from '/common/constants';
import { WindowCommand } from '/common/models/project';

export const WindowsControls = () => {
    const [isMaximized, setIsMaximized] = useState(true);

    if (process.platform !== 'win32') {
        return null;
    }

    function sendCommand(command: WindowCommand) {
        window.api.invoke(MainChannels.SEND_WINDOW_COMMAND, command);
        if (command === WindowCommand.MAXIMIZE || command === WindowCommand.UNMAXIMIZE) {
            setIsMaximized(!isMaximized);
        }
    }

    return (
        <div className="flex text-foreground-active h-full">
            <Button
                onClick={() => sendCommand(WindowCommand.MINIMIZE)}
                variant={'ghost'}
                className="hover:bg-background-onlook/30  hover:text-foreground outline-border w-full h-full rounded-none"
                aria-label="Minimize"
            >
                <MinusIcon className="h-3 w-3" />
            </Button>
            <Button
                onClick={() =>
                    sendCommand(isMaximized ? WindowCommand.UNMAXIMIZE : WindowCommand.MAXIMIZE)
                }
                variant={'ghost'}
                className="hover:bg-background-onlook/30 hover:text-foreground outline-border w-full h-full rounded-none"
                aria-label="Maximize"
            >
                <CopyIcon className="h-3 w-3 scale-x-[-1]" />
            </Button>
            <Button
                onClick={() => sendCommand(WindowCommand.CLOSE)}
                variant={'ghost'}
                className="hover:bg-[#e81123] active:bg-[#e81123]/50 hover:text-foreground outline-border w-full h-full rounded-none"
                aria-label="Close"
            >
                <Cross1Icon className="h-3 w-3" />
            </Button>
        </div>
    );
};
