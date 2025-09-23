import type { Project } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { CloneProject } from './clone-project';
import { CreateTemplate } from './create-template';
import { DeleteProject } from './delete-project';
import { RenameProject } from './rename-project';

export function SettingsDropdown({ project, refetch }: { project: Project; refetch: () => void }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    size="default"
                    variant="ghost"
                    className="w-8 h-8 p-0 flex items-center justify-center hover:bg-background-onlook cursor-pointer backdrop-blur-lg"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Icons.DotsHorizontal />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="z-50"
                align="end"
                alignOffset={-4}
                sideOffset={8}
                onClick={(e) => e.stopPropagation()}
            >
                <RenameProject project={project} refetch={refetch} />
                <CloneProject project={project} refetch={refetch} />
                <CreateTemplate project={project} refetch={refetch} />
                <DeleteProject project={project} refetch={refetch} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
