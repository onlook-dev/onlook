import { useProjectsManager } from '@/components/Context';
import { RunState } from '@onlook/models/run';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

const RunButton = observer(() => {
    const projectsManager = useProjectsManager();
    const runner = projectsManager.runner;
    const [isLoading, setIsLoading] = useState(false);

    function renderIcon() {
        if (isLoading) {
            return <Icons.Shadow className="animate-spin" />;
        }

        switch (runner?.state) {
            case RunState.SETTING_UP:
            case RunState.STOPPING:
                return <Icons.Shadow className="animate-spin" />;
            case RunState.ERROR:
                return <Icons.ExclamationTriangle />;
            case RunState.RUNNING:
                return <Icons.Stop />;
            default:
                return <Icons.Play />;
        }
    }

    function handleButtonClick() {
        if (!runner) {
            console.error('No runner found.');
            return;
        }

        if (runner.state === RunState.STOPPED) {
            runner.start();
            startLoadingTimer();
        } else if (runner.state === RunState.RUNNING) {
            runner.stop();
        } else if (runner.state === RunState.ERROR) {
            runner.restart();
        } else {
            console.error('Unexpected state:', runner.state);
        }
    }

    function startLoadingTimer() {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
        }, 10000);
    }

    function getExtraButtonClasses() {
        if (isLoading) {
            return '';
        }
        if (runner?.state === RunState.STOPPED) {
            return 'text-green-600 bg-green-500/10 hover:bg-green-500/30 active:bg-green-500/40 hover:text-green-100 active:text-green-100';
        }
        if (runner?.state === RunState.ERROR || runner?.state === RunState.RUNNING) {
            return 'text-red-400 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 hover:text-red-50 active:text-red-50';
        }
        return '';
    }

    function getButtonTitle() {
        if (isLoading) {
            return 'Running...';
        }

        if (runner?.state === RunState.STOPPED) {
            return 'Play';
        }
        if (runner?.state === RunState.ERROR) {
            return 'Restart';
        }
        if (runner?.state === RunState.RUNNING) {
            return 'Stop';
        }
        return 'Unknown';
    }

    return (
        <Button
            variant="ghost"
            className={cn(
                'h-11 -my-2 border-transparent rounded-none w-[fit-content] px-3 gap-x-1.5',
                getExtraButtonClasses(),
            )}
            disabled={
                isLoading ||
                runner?.state === RunState.SETTING_UP ||
                runner?.state === RunState.STOPPING
            }
            onClick={handleButtonClick}
        >
            {renderIcon()}
            <span className="text-mini">{getButtonTitle()}</span>
        </Button>
    );
});

export default RunButton;
