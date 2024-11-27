import { useProjectsManager } from '@/components/Context';
import { RunState } from '@onlook/models/run';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';

const RunButton = observer(() => {
    const projectsManager = useProjectsManager();
    const runner = projectsManager.runner;

    function renderIcon() {
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
        } else if (runner.state === RunState.RUNNING) {
            runner.stop();
        } else if (runner.state === RunState.ERROR) {
            runner.restart();
        } else {
            console.error('Unexpected state:', runner.state);
        }
    }

    return (
        <Button
            variant="ghost"
            className={cn(
                'h-11 -my-2 border-transparent rounded-none w-[fit-content] px-3 gap-x-1.5 bg-[radial-gradient(169.40%_89.55%_at_94.76%_6.29%,rgba(0,0,0,0.40)_0%,rgba(255,255,255,0.00)_100%)]',
                runner?.state === RunState.STOPPED &&
                    'text-green-600 bg-green-500/10 hover:bg-green-500/30 active:bg-green-500/40 hover:text-green-100 active:text-green-100',
                (runner?.state === RunState.ERROR || runner?.state === RunState.RUNNING) &&
                    'text-red-400 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 hover:text-red-50 active:text-red-50',
            )}
            disabled={runner?.state === RunState.SETTING_UP || runner?.state === RunState.STOPPING}
            onClick={handleButtonClick}
        >
            {renderIcon()}
            <span className="text-mini">
                {runner?.state === RunState.STOPPED ? 'Play' : 'Stop'}
            </span>
        </Button>
    );
});

export default RunButton;
