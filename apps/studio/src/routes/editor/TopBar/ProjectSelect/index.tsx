import { useEditorEngine, useProjectsManager, useRouteManager } from '@/components/Context';
import { Route } from '@/lib/routes';
import { invokeMainChannel } from '@/lib/utils';
import ProjectSettingsModal from '@/routes/projects/ProjectSettingsModal';
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
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import ProjectNameInput from './ProjectNameInput';

const ProjectBreadcrumb = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();
    const routeManager = useRouteManager();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    async function handleReturn() {
        try {
            await saveScreenshot();
        } catch (error) {
            console.error('Failed to take screenshot:', error);
        }
        projectsManager.project = null;
        routeManager.route = Route.PROJECTS;
    }

    const handleOpenProjectFolder = () => {
        const project = projectsManager.project;
        if (project && project.folderPath) {
            invokeMainChannel(MainChannels.OPEN_IN_EXPLORER, project.folderPath);
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
        project.updatedAt = new Date().toISOString();
        projectsManager.updateProject(project);
    }

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
                            <div className="flex row center items-center group">
                                <Icons.Directory className="mr-2 group-hover:hidden" />
                                <Icons.DirectoryOpen className="mr-2 hidden group-hover:block" />
                                {'Open Project Folder'}
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                            <div className="flex row center items-center group">
                                <Icons.Gear className="mr-2 transition-transform duration-300 group-hover:rotate-[30deg]" />
                                Project Settings
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <ProjectSettingsModal
                project={projectsManager.project}
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
            >
                {null}
            </ProjectSettingsModal>
        </>
    );
});

export default ProjectBreadcrumb;
