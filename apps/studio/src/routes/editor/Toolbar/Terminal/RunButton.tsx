import { useProjectsManager } from '@/components/Context';
import { RunState } from '@/lib/projects/run';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';

const RunButton = observer(() => {
    const projectsManager = useProjectsManager();
    const currentProject = projectsManager.project;
    const runManager = projectsManager.getActiveRunManager();
    const runState = runManager?.state ?? RunState.READY;

    function renderIcon() {
        switch (runState) {
            case RunState.WAITING:
            case RunState.PRERUN:
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
        if (!currentProject) {
            console.error('No project selected.');
            return;
        }

        if (runState === RunState.READY) {
            projectsManager.run(currentProject);
        } else if (runState === RunState.RUNNING) {
            projectsManager.stop(currentProject);
        } else {
            console.error('Unexpected state:', runState);
        }
    }

    return (
        <Button
            size="icon"
            variant="ghost"
            className={cn(
                'h-8 w-8',
                runState === RunState.READY &&
                    'text-green-400 bg-green-500/10 hover:bg-green-500/20 active:bg-green-500/30 hover:text-green-50 active:text-green-50',
                (runState === RunState.ERROR || runState === RunState.RUNNING) &&
                    'text-red-400 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 hover:text-red-50 active:text-red-50',
            )}
            disabled={
                !currentProject || runState === RunState.WAITING || runState === RunState.PRERUN
            }
            onClick={handleButtonClick}
        >
            {renderIcon()}
        </Button>
    );
});

export default RunButton;
