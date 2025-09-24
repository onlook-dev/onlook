import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { TooltipArrow } from '@radix-ui/react-tooltip';
import { observer } from 'mobx-react-lite';
import { FileModal } from './modals/file-modal';
import { FolderModal } from './modals/folder-modal';
import { UploadModal } from './modals/upload-modal';

export const CodeControls = observer(() => {
    const editorEngine = useEditorEngine();
    const isDirty = editorEngine.ide.activeFile?.isDirty ?? false;

    const saveFile = () => {
        void editorEngine.ide.saveActiveFile();
    };

    const basePath = (() => {
        const activeFilePath = editorEngine.ide.activeFile?.path ?? '';
        if (!activeFilePath) return '';

        const lastSlash = activeFilePath.lastIndexOf('/');
        return lastSlash > 0 ? activeFilePath.substring(0, lastSlash) : '';
    })();

    return (
        <>
            <div className="flex flex-row items-center transition-opacity duration-200">
                <Tooltip>
                    <DropdownMenu>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="p-2 w-fit h-fit hover:bg-background-onlook cursor-pointer"
                                >
                                    <Icons.FilePlus className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => editorEngine.ide.fileModalOpen = true}
                            >
                                <Icons.FilePlus className="h-4 w-4 mr-2" />
                                Create new file
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => editorEngine.ide.uploadModalOpen = true}
                            >
                                <Icons.Upload className="h-4 w-4 mr-2" />
                                Upload file
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <TooltipContent side="bottom" hideArrow>
                        <p>Create or Upload File</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editorEngine.ide.folderModalOpen = true}
                            className="p-2 w-fit h-fit hover:bg-background-onlook cursor-pointer"
                        >
                            <Icons.DirectoryPlus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" hideArrow>
                        <p>New Folder</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="secondary"
                            size="icon"
                            onClick={saveFile}
                            disabled={!isDirty}
                            className={cn(
                                "px-1.5 py-0.75 w-fit h-fit cursor-pointer mr-0.5 ml-1",
                                isDirty
                                    ? "text-background-primary hover:text-teal-100 hover:bg-teal-500 bg-foreground-primary"
                                    : "hover:bg-background-onlook hover:text-teal-200"
                            )}
                        >
                            <Icons.Save className={cn(
                                "h-4 w-4",
                                isDirty && "text-teal-200 group-hover:text-teal-100"
                            )} />
                            <span className="text-small">Save</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" hideArrow>
                        <p>Save changes</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            <FileModal basePath={basePath} />
            <FolderModal basePath={basePath} />
            <UploadModal basePath={basePath} />
        </>
    );
}); 