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
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuSub,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { ChevronRightIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import PricingPage from '../Profile/PricingPage';

const ProjectBreadcrumb = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();
    const routeManager = useRouteManager();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

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
                <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant={'ghost'}
                            onMouseEnter={() => setIsOpen(true)}
                            onMouseLeave={(e) => {
                                const relatedTarget = e.relatedTarget as HTMLElement;
                                if (!relatedTarget?.closest('[role="menu"]')) {
                                    setIsOpen(false);
                                }
                            }}
                            className="mx-0 px-0 gap-2 text-foreground-onlook text-small hover:text-foreground-active hover:bg-transparent"
                        >
                            <Icons.OnlookLogo className="w-6 h-6 hidden md:block" />
                            <span className="mx-0 max-w-[60px] md:max-w-[100px] lg:max-w-[200px] px-0 text-foreground-onlook text-small truncate cursor-pointer">
                                {projectsManager.project?.name}
                            </span>
                            <Icons.ChevronDown className="transition-all rotate-0 group-data-[state=open]:-rotate-180 duration-200 ease-in-out text-foreground-onlook " />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="start"
                        className="w-48"
                        onMouseEnter={() => setIsOpen(true)}
                        onMouseLeave={() => setIsOpen(false)}
                    >
                        <DropdownMenuItem onClick={handleReturn}>
                            <div className="flex row center items-center group">
                                <Icons.Tokens className="mr-2 group-hover:rotate-12 transition-transform" />
                                {'Go to all Projects'}
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Icons.Plus className="mr-2 h-4 w-4" />
                                New Project
                                <ChevronRightIcon className="ml-auto h-4 w-4" />
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem
                                    onClick={() => (routeManager.route = Route.PROJECTS)}
                                >
                                    Create a new project
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => (routeManager.route = Route.PROJECTS)}
                                >
                                    Import a project
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
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
