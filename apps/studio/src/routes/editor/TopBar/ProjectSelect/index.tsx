import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { getRunProjectCommand } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { toast } from '@onlook/ui/use-toast';
import { observer } from 'mobx-react-lite';
import ProjectNameInput from './ProjectNameInput';

const ProjectBreadcrumb = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();

    async function handleReturn() {
        await saveScreenshot();
        projectsManager.project = null;
    }

    const handleOpenProjectFolder = () => {
        const project = projectsManager.project;
        if (project && project.folderPath) {
            window.api.invoke(MainChannels.OPEN_IN_EXPLORER, project.folderPath);
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

    const handleCopyRunCommand = () => {
        const project = projectsManager.project;
        if (project && project.folderPath) {
            const command = getRunProjectCommand(project.folderPath);
            navigator.clipboard.writeText(command);
            toast({ title: 'Copied to clipboard' });
        }
    };

    return (
        <>
            <div className="mx-2 flex flex-row items-center text-small gap-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={'ghost'}
                            className="mx-0 px-0 text-foreground-onlook text-small hover:text-foreground-active hover:bg-transparent"
                            onClick={handleReturn}
                        >
                            <Icons.OnlookLogo className="w-6 h-6 mr-2 hidden md:block" />
                            {'Onlook'}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="pt-1 text-background bg-foreground">
                        Return to project selection
                    </TooltipContent>
                </Tooltip>
                <p className="mb-[2px] min-w-[4px] text-foreground-onlook">{'/'}</p>
                <ProjectNameInput />
                <DropdownMenu>
                    <DropdownMenuTrigger className="group flex flex-row gap-2 items-center mx-0 px-0 text-foreground-onlook text-small hover:text-foreground-hover hover:bg-transparent">
                        <Icons.ChevronDown className="transition-all rotate-0 group-data-[state=open]:-rotate-180 duration-200 ease-in-out" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={handleOpenProjectFolder}>
                            <div className="flex row center items-center">
                                <Icons.File className="mr-2" />
                                {'Open Project Folder'}
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCopyRunCommand}>
                            <div className="flex row center items-center">
                                <Icons.ClipboardCopy className="mr-2" />
                                <div className="flex flex-col">
                                    <div className="text-smallPlus">{'Copy Run Command'}</div>
                                    <div className="text-mini text-muted-foreground">
                                        {'Paste this into Terminal to run your App'}
                                    </div>
                                </div>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </>
    );
});

export default ProjectBreadcrumb;
