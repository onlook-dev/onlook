import { useProjectsManager } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';

const RunButton = observer(() => {
    const projectsManager = useProjectsManager();

    function renderIcon() {
        switch (projectsManager.state) {
            case 'waiting':
                return <Icons.Shadow className="animate-spin" />;
            case 'error':
                return <Icons.ExclamationTriangle />;
            case 'running':
                return <Icons.Stop />;
            default:
                return <Icons.Play />;
        }
    }

    function handleButtonClick() {
        if (!projectsManager.project) {
            console.error('No project selected.');
            return;
        }
        if (projectsManager.state === 'running') {
            projectsManager.stop(projectsManager.project);
        } else if (projectsManager.state === 'stopped') {
            projectsManager.run(projectsManager.project);
        } else {
            console.error('Unexpected state:', projectsManager.state);
        }
    }

    return (
        <Button
            size="icon"
            variant="ghost"
            className={cn(
                'h-8 w-8',
                projectsManager.state === 'stopped' &&
                    'text-green-400 bg-green-500/10 hover:bg-green-500/20 active:bg-green-500/30 hover:text-green-50 active:text-green-50',
                projectsManager.state === 'error' &&
                    'text-red-400 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 hover:text-red-50 active:text-red-50',
                projectsManager.state === 'running' &&
                    'text-red-400 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 hover:text-red-50 active:text-red-50',
            )}
            disabled={!projectsManager.project || projectsManager.state === 'waiting'}
            onClick={handleButtonClick}
        >
            {renderIcon()}
        </Button>
    );
});

export default RunButton;
