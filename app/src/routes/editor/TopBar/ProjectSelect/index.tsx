import iconLogo from '@/assets/icon-logo.svg';
import { useProjectsManager } from '@/components/Context';
import { Button } from '@/components/ui/button';
import { observer } from 'mobx-react-lite';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const ProjectBreadcrumb = observer(() => {
    const projectsManager = useProjectsManager();

    return (
        <div className="mx-2 flex flex-row items-center text-small text-text gap-2">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={'ghost'}
                        className="mx-0 px-0 text-text text-small hover:text-text-active hover:bg-transparent"
                        onClick={() => (projectsManager.project = null)}
                    >
                        <img
                            src={iconLogo}
                            className="w-6 h-6 mr-2 hidden md:block"
                            alt="Onlook logo"
                        />
                        {'Onlook'}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="pt-1">
                    Return to project selection
                </TooltipContent>
            </Tooltip>
            <p className="mb-[2px] min-w-[4px]">{'/'}</p>
            <p className="mx-0 max-w-[60px] md:max-w-[100px] lg:max-w-[200px] px-0 text-text text-small truncate hover:text-text hover:bg-transparent">
                {projectsManager.project?.name}
            </p>
        </div>
    );
});

export default ProjectBreadcrumb;
