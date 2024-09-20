import iconLogo from '@/assets/icon-logo.svg';
import { useProjectsManager } from '@/components/Context';
import { Button } from '@/components/ui/button';
import { observer } from 'mobx-react-lite';

const ProjectBreadcrumb = observer(() => {
    const projectsManager = useProjectsManager();

    return (
        <div className="mx-2 flex flex-row items-center text-small text-text gap-2">
            <Button
                variant={'ghost'}
                className="mx-0 px-0 text-text text-small hover:text-text-active hover:bg-transparent"
                onClick={() => (projectsManager.project = null)}
            >
                <img src={iconLogo} className="w-6 h-6 mr-2" alt="Onlook logo" />
                {'Onlook'}
            </Button>
            <p className="mb-[2px]">{'/'}</p>
            <p className="mx-0 px-0 text-text text-small hover:text-text hover:bg-transparent">
                {projectsManager.project?.name}
            </p>
        </div>
    );
});

export default ProjectBreadcrumb;
