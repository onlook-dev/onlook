import { useState } from 'react';
import { Button } from '../ui/button';
import { MainChannels } from '/common/constants';
import { WindowCommand } from '/common/models/project';

export const WindowsControls = () => {
    const [isMaximized, setIsMaximized] = useState(false);

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
        <div className="flex mx-2 text-foreground-active">
            <Button
                onClick={() => sendCommand(WindowCommand.MINIMIZE)}
                variant={'ghost'}
                className="hover:bg-background-onlook/30  hover:text-foreground outline-border"
                aria-label="Minimize"
            >
                <MinusIcon className="h-3 w-3" />
            </Button>
            <Button
                onClick={() =>
                    sendCommand(isMaximized ? WindowCommand.UNMAXIMIZE : WindowCommand.MAXIMIZE)
                }
                variant={'ghost'}
                className="hover:bg-background-onlook/30 hover:text-foreground outline-border"
                aria-label="Maximize"
            >
                <SquareIcon className="h-3 w-3" />
            </Button>
            <Button
                onClick={() => sendCommand(WindowCommand.CLOSE)}
                variant={'ghost'}
                className="hover:bg-background-onlook/30 hover:text-foreground outline-border"
                aria-label="Close"
            >
                <Cross1Icon className="h-3 w-3" />
            </Button>
        </div>
    );
};
