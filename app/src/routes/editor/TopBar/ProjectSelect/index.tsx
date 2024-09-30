import iconLogo from '@/assets/icon-logo.svg';
import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { observer } from 'mobx-react-lite';

const ProjectBreadcrumb = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();

    async function handleReturn() {
        await saveScreenshot();
        projectsManager.project = null;
    }

    async function saveScreenshot() {
        const project = projectsManager.project;
        if (!project) {
            console.error('No project selected');
            return;
        }
        const projectId = project.id;
        const imageName = await editorEngine.takeScreenshot(projectId);
        if (!imageName) {
            console.error('Failed to take screenshot');
            return;
        }
        project.previewImg = imageName;
        projectsManager.updateProject(project);
    }

    return (
        <div className="mx-2 flex flex-row items-center text-small gap-2">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={'ghost'}
                        className="mx-0 px-0 text-text text-small hover:text-text-active hover:bg-transparent"
                        onClick={handleReturn}
                    >
                        <img
                            src={iconLogo}
                            className="w-6 h-6 mr-2 hidden md:block"
                            alt="Onlook logo"
                        />
                        {'Onlook'}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="pt-1 text-active">
                    Return to project selection
                </TooltipContent>
            </Tooltip>
            <p className="mb-[2px] min-w-[4px] text-text">{'/'}</p>
            <p className="mx-0 max-w-[60px] md:max-w-[100px] lg:max-w-[200px] px-0 text-text text-small truncate hover:text-text hover:bg-transparent">
                {projectsManager.project?.name}
            </p>
        </div>
    );
});

export default ProjectBreadcrumb;
