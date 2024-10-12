import iconLogo from '@/assets/icon-logo.svg';
import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDownIcon, FileIcon } from '@radix-ui/react-icons';
import { MainChannels } from '/common/constants';
import { observer } from 'mobx-react-lite';

const ProjectBreadcrumb = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();

    async function handleReturn() {
        await saveScreenshot();
        projectsManager.project = null;
    }

    const handleOpenProjectFolder = () => {
        const project = projectsManager.project; // Ensure you have the project reference
        if (project && project.folderPath) {
            // Check if project exists and has folderPath
            window.api.invoke(MainChannels.OPEN_IN_EXPLORER, project.folderPath); // Use project.folderPath
        }
    };

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
                        className="mx-0 px-0 text-foreground-onlook text-small hover:text-foreground-active hover:bg-transparent"
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
            <p className="mb-[2px] min-w-[4px] text-foreground-onlook">{'/'}</p>
            <DropdownMenu>
                <DropdownMenuTrigger className="flex flex-row gap-2 items-center mx-0 max-w-[60px] md:max-w-[100px] lg:max-w-[200px] px-0 text-foreground-onlook text-small truncate hover:text-foreground-onlook hover:bg-transparent">
                    {projectsManager.project?.name}
                    <ChevronDownIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleOpenProjectFolder}>
                        <div className="flex row center items-center">
                            <FileIcon className="mr-2" />
                            {'Open Project Folder'}
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
});

export default ProjectBreadcrumb;
