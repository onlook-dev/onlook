import { useEditorEngine, useProjectsManager, useRouteManager } from '@/components/Context';
import { Route } from '@/lib/routes';
import { invokeMainChannel } from '@/lib/utils';
import ProjectSettingsModal from '@/routes/projects/ProjectSettingsModal';
import { MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@onlook/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import PricingPage from '../Profile/PricingPage';

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
        setTimeout(() => {
            projectsManager.project = null;
            routeManager.route = Route.PROJECTS;
        }, 100);
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
        const result = await editorEngine.takeActiveWebviewScreenshot(projectId, {
            save: true,
        });
        if (!result || !result.name) {
            console.error('Failed to take screenshot');
            return;
        }
        project.previewImg = result.name;
        project.updatedAt = new Date().toISOString();
        projectsManager.updateProject(project);
    }

    return (
        <Dialog
            open={editorEngine.isPlansOpen}
            onOpenChange={(open) => (editorEngine.isPlansOpen = open)}
        >
            <div className="mx-2 flex flex-row items-center text-small gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant={'ghost'}
                            className="mx-0 px-0 gap-2 text-foreground-onlook text-small hover:text-foreground-active hover:bg-transparent"
                        >
                            <Icons.OnlookLogo className="w-6 h-6 hidden md:block" />
                            <span className="mx-0 max-w-[60px] md:max-w-[100px] lg:max-w-[200px] px-0 text-foreground-onlook text-small truncate cursor-pointer">
                                {projectsManager.project?.name}
                            </span>
                            <Icons.ChevronDown className="transition-all rotate-0 group-data-[state=open]:-rotate-180 duration-200 ease-in-out text-foreground-onlook " />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem onClick={handleReturn}>
                            <div className="flex row center items-center group">
                                <Icons.Tokens className="mr-2 group-hover:rotate-12 transition-transform" />
                                {'Go to all Projects'}
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleOpenProjectFolder}>
                            Open folder
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                            Settings
                        </DropdownMenuItem>
                        <DialogTrigger asChild>
                            <DropdownMenuItem>Subscriptions</DropdownMenuItem>
                        </DialogTrigger>
                        <DropdownMenuItem
                            onClick={() => window.open('https://onlook.com', '_blank')}
                        >
                            About Onlook
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <ProjectSettingsModal
                project={projectsManager.project}
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
            ></ProjectSettingsModal>
            <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none">
                <PricingPage />
            </DialogContent>
        </Dialog>
    );
});

export default ProjectBreadcrumb;
