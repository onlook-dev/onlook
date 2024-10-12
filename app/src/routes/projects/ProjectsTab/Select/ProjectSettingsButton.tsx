import { useProjectsManager } from '@/components/Context';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DotsVerticalIcon, TrashIcon, FileIcon } from '@radix-ui/react-icons';
import React from 'react';
import { Project } from '/common/models/project';
import { MainChannels } from '/common/constants';

export default function ProjectSettingsButton({ project }: { project: Project }) {
    const projectsManager = useProjectsManager();
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

    const handleDeleteProject = () => {
        projectsManager.deleteProject(project);
        setShowDeleteDialog(false);
    };

    const handleOpenProjectFolder = () => {
        if (project.folderPath) {
            window.api.invoke(MainChannels.OPEN_IN_EXPLORER, project.folderPath);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="default" variant="ghost" className="gap-2 w-full lg:w-auto">
                        <DotsVerticalIcon />
                        <p>Project settings</p>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem
                        onSelect={handleOpenProjectFolder}
                        className="text-foreground-active hover:!bg-background-onlook hover:!text-foreground-active gap-2"
                    >
                        <FileIcon className="w-4 h-4" />
                        Open Project Folder
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => setShowDeleteDialog(true)}
                        className="gap-2 text-red-500 hover:!bg-red-400 hover:!text-red-800 dark:text-red-200 dark:hover:!bg-red-800 dark:hover:!text-red-100"
                    >
                        <TrashIcon className="w-4 h-4" />
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
        </>
    );
}
