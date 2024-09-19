import iconLogo from '@/assets/icon-logo.svg';
import { useProjectManager } from '@/components/Context/Projects';
import { Button } from '@/components/ui/button';
import { observer } from 'mobx-react-lite';

const ProjectSelect = observer(() => {
    const projectManager = useProjectManager();

    return (
        <div className="mx-2 flex flex-row items-center text-xs text-text gap-2">
            <Button
                variant={'ghost'}
                className="mx-0 px-0 text-text text-xs hover:text-text-active"
                onClick={() => (projectManager.project = null)}
            >
                <img src={iconLogo} className="w-5 h-5 mr-2" alt="Google logo" />
                {'Onlook'}
            </Button>
            <p>{'/'}</p>
            <Button
                variant={'ghost'}
                className="mx-0 px-0 text-text text-xs hover:text-text hover:bg-transparent"
            >
                {projectManager.project?.name}
            </Button>
        </div>
    );
});

export default ProjectSelect;
