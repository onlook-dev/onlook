import { useProjectsManager } from '@/components/Context';
import { RunState } from '@onlook/models/run';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

enum OnlookState {
    NOT_RUNNING,
    RUNNING_NOT_ENABLED,
    RUNNING_ENABLED,
    LOADING,
}

const OnlookEnabledButton = observer(({ onlookEnabled }: { onlookEnabled: boolean }) => {
    const projectsManager = useProjectsManager();
    const isRunning = projectsManager.runner?.state === RunState.RUNNING;
    const getState = () => {
        return isRunning
            ? onlookEnabled
                ? OnlookState.RUNNING_ENABLED
                : OnlookState.RUNNING_NOT_ENABLED
            : OnlookState.NOT_RUNNING;
    };
    const [state, setState] = useState(getState());
    const [previousState, setPreviousState] = useState(state);

    useEffect(() => {
        if (isRunning && previousState === OnlookState.NOT_RUNNING) {
            setState(OnlookState.LOADING);
            setTimeout(() => {
                setState(getState());
            }, 5000);
        } else {
            setState(getState());
        }
        setPreviousState(state);
    }, [isRunning, onlookEnabled]);

    let buttonIcon;
    switch (state) {
        case OnlookState.RUNNING_ENABLED:
            buttonIcon = <Icons.CheckCircled />;
            break;
        case OnlookState.RUNNING_NOT_ENABLED:
            buttonIcon = <Icons.ExclamationTriangle />;
            break;
        case OnlookState.NOT_RUNNING:
            buttonIcon = <Icons.CircleBackslash />;
            break;
        case OnlookState.LOADING:
            buttonIcon = <Icons.Shadow className="animate-spin" />;
            break;
    }

    const button = (
        <Button
            variant="outline"
            className={cn(
                'bg-background-secondary/60 px-3',
                (state === OnlookState.RUNNING_NOT_ENABLED || state === OnlookState.NOT_RUNNING) &&
                    'bg-red-500 hover:bg-red-700',
            )}
            disabled={state === OnlookState.LOADING}
        >
            {buttonIcon}
        </Button>
    );

    let popoverContent;
    switch (state) {
        case OnlookState.RUNNING_ENABLED:
            popoverContent = (
                <div className="space-y-2 flex flex-col">
                    <div className="flex gap-2 w-full justify-center">
                        <p className="text-active text-largePlus">Onlook is enabled</p>
                        <Icons.CheckCircled className="mt-[3px] text-foreground-positive" />
                    </div>
                    <p className="text-foreground-onlook text-regular w-80 text-wrap">
                        Your codebase is now linked to the editor, giving you advanced features like
                        write-to-code, component detection, code inspect, and more
                    </p>
                </div>
            );
            break;
        case OnlookState.RUNNING_NOT_ENABLED:
            popoverContent = (
                <div className="space-y-2 flex flex-col">
                    <div className="flex gap-2 width-full justify-center">
                        <p className="text-active text-largePlus">{'Onlook is not enabled'}</p>
                        <Icons.CircleBackslash className="mt-[3px] text-red-500" />
                    </div>
                    <p className="text-foreground-onlook text-regular">
                        {
                            "You won't get advanced features like write-to-code, component detection, code inspect, and more."
                        }
                    </p>
                </div>
            );
            break;
        case OnlookState.NOT_RUNNING:
            popoverContent = (
                <div className="space-y-2 flex flex-col">
                    <div className="flex gap-2 width-full justify-center">
                        <p className="text-active text-largePlus">{'Onlook is not running'}</p>
                        <Icons.CircleBackslash className="mt-[3px] text-red-500" />
                    </div>
                    <p className="text-foreground-onlook text-regular">
                        {'Hit the play button to start running your project'}
                    </p>
                </div>
            );
    }

    return (
        <Popover>
            <PopoverTrigger asChild>{button}</PopoverTrigger>
            <PopoverContent>{popoverContent}</PopoverContent>
        </Popover>
    );
});

export default OnlookEnabledButton;
