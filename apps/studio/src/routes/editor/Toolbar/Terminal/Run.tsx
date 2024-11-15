import { useProjectsManager } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';

const RunButton = observer(() => {
    const projectsManager = useProjectsManager();
    return (
        <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-green-400 bg-green-500/10 hover:bg-green-500/20 active:bg-green-500/30 hover:text-green-50 active:text-green-50"
            onClick={() => projectsManager.project && projectsManager.run(projectsManager.project)}
        >
            <Icons.Play />
        </Button>
    );
});

export default RunButton;
