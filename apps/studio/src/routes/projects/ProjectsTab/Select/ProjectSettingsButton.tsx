import { useProjectsManager } from '@/components/Context';
import { invokeMainChannel } from '@/lib/utils';
import { getRandomPlaceholder } from '@/routes/projects/helpers';
import { MainChannels } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import { Checkbox } from '@onlook/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { cn } from '@onlook/ui/utils';
import { useEffect, useMemo, useState } from 'react';
import ProjectSettingsModal from '../../ProjectSettingsModal';

export default function ProjectSettingsButton({ project }: { project: Project }) {
    const projectsManager = useProjectsManager();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteProjectFolder, setDeleteProjectFolder] = useState(false);
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [projectName, setProjectName] = useState(project.name);
    const isProjectNameEmpty = useMemo(() => projectName.length === 0, [projectName]);
    const [isDirectoryHovered, setIsDirectoryHovered] = useState(false);

    useEffect(() => {
        setProjectName(project.name);
    }, [project.name]);

    const handleDeleteProject = () => {
        projectsManager.deleteProject(project, deleteProjectFolder);
        setShowDeleteDialog(false);
    };

    const handleRenameProject = () => {
        projectsManager.updateProject({ ...project, name: projectName });
        setShowRenameDialog(false);
    };

    const handleOpenProjectFolder = () => {
        if (project.folderPath) {
            invokeMainChannel(MainChannels.OPEN_IN_EXPLORER, project.folderPath);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="default" variant="ghost" className="gap-2 w-full lg:w-auto">
                        <Icons.DotsVertical />
                        <p>Project settings</p>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem
                        onSelect={handleOpenProjectFolder}
                        onMouseEnter={() => setIsDirectoryHovered(true)}
                        onMouseLeave={() => setIsDirectoryHovered(false)}
                        className="text-foreground-active hover:!bg-background-onlook hover:!text-foreground-active gap-2"
                    >
                        {isDirectoryHovered ? (
                            <Icons.DirectoryOpen className="w-4 h-4" />
                        ) : (
                            <Icons.Directory className="w-4 h-4" />
                        )}
                        {'Open Project Folder'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => setShowRenameDialog(true)}
                        className="text-foreground-active hover:!bg-background-onlook hover:!text-foreground-active gap-2"
                    >
                        <Icons.Pencil className="w-4 h-4" />
                        Rename Project
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <ProjectSettingsModal project={project}>
                            <div className="flex row center items-center">
                                <Icons.Gear className="mr-2" /> Edit Settings
                            </div>
                        </ProjectSettingsModal>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => setShowDeleteDialog(true)}
                        className="gap-2 text-red-400 hover:!bg-red-200/80 hover:!text-red-700 dark:text-red-200 dark:hover:!bg-red-800 dark:hover:!text-red-100"
                    >
                        <Icons.Trash className="w-4 h-4" />
                        Delete Project
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Are you sure you want to delete this project?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your project
                            and remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="deleteFolder"
                            checked={deleteProjectFolder}
                            onCheckedChange={(checked) =>
                                setDeleteProjectFolder(checked as boolean)
                            }
                        />
                        <Label htmlFor="deleteFolder">Also move folder to trash</Label>
                    </div>
                    <AlertDialogFooter>
                        <Button variant={'ghost'} onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant={'destructive'}
                            className="rounded-md text-sm"
                            onClick={handleDeleteProject}
                        >
                            Delete
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Rename Project</AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="flex flex-col w-full gap-2">
                        <Label htmlFor="text">Project Name</Label>
                        <Input
                            minLength={0}
                            type="text"
                            placeholder={getRandomPlaceholder()}
                            value={projectName || ''}
                            onInput={(e) => setProjectName(e.currentTarget.value)}
                        />
                        <p
                            className={cn(
                                'text-xs text-red-500 transition-opacity',
                                isProjectNameEmpty ? 'opacity-100' : 'opacity-0',
                            )}
                        >
                            {"Project name can't be empty"}
                        </p>
                    </div>
                    <AlertDialogFooter>
                        <Button variant={'ghost'} onClick={() => setShowRenameDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={isProjectNameEmpty}
                            className="rounded-md text-sm"
                            onClick={handleRenameProject}
                        >
                            Rename
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
