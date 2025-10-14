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
import { useState } from 'react';
import { FileModal } from './modals/file-modal';
import { FolderModal } from './modals/folder-modal';
import { UploadModal } from './modals/upload-modal';

interface CodeControlsProps {
    isDirty: boolean;
    currentPath: string;
    onSave: () => Promise<void>;
    onRefresh: () => void;
    onCreateFile: (filePath: string, content?: string | Uint8Array) => Promise<void>;
    onCreateFolder: (folderPath: string) => Promise<void>;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isSidebarOpen: boolean) => void;
}

export const CodeControls = ({ isDirty, currentPath, onSave, onRefresh, onCreateFile, onCreateFolder, isSidebarOpen, setIsSidebarOpen }: CodeControlsProps) => {
    const [showFileModal, setShowFileModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!isDirty || isSaving) return;

        try {
            setIsSaving(true);
            await onSave();
        } catch (error) {
            console.error('Failed to save file:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleModalSuccess = () => {
        onRefresh();
    };

    return (
        <div className="flex flex-row items-center justify-between p-1 border-b border-border w-full h-10">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-foreground-secondary hover:text-foreground-primary py-1 px-2 w-fit h-fit bg-transparent hover:!bg-transparent cursor-pointer"
            >
                {isSidebarOpen ? <Icons.SidebarLeftCollapse className="h-4 w-4" /> : <Icons.MoveToFolder className="h-4 w-4" />}
                <span className="text-small ml-0.5">
                    {isSidebarOpen ? '' : 'View Files'}
                </span>
            </Button>
            <div className="flex flex-row items-center transition-opacity duration-200 ml-auto">

                <Tooltip>
                    <DropdownMenu>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="py-1 px-2 w-fit h-fit bg-transparent hover:!bg-transparent cursor-pointer text-foreground-secondary hover:text-foreground-primary"
                                >
                                    <Icons.FilePlus className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => setShowFileModal(true)}
                            >
                                <Icons.FilePlus className="h-4 w-4 mr-2" />
                                Create new file
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => setShowUploadModal(true)}
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
                            onClick={() => setShowFolderModal(true)}
                            className="py-1 px-2 w-fit h-fit bg-transparent hover:!bg-transparent cursor-pointer text-foreground-secondary hover:text-foreground-primary"
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
                            onClick={handleSave}
                            disabled={!isDirty || isSaving}
                            className={cn(
                                "px-2 py-1 w-fit h-fit cursor-pointer mr-0.5 ml-1",
                                isDirty
                                    ? "text-background-primary hover:text-teal-100 hover:bg-teal-500 bg-foreground-primary"
                                    : "hover:bg-background-onlook hover:text-teal-200"
                            )}
                        >
                            {isSaving ? (
                                <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                            ) : (
                                <Icons.Save className={cn(
                                    "h-4 w-4",
                                    isDirty && "text-teal-200 group-hover:text-teal-100"
                                )} />
                            )}
                            <span className="text-small">{isSaving ? 'Saving...' : 'Save'}</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" hideArrow>
                        <p>{isSaving ? 'Saving changes...' : 'Save changes'}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            <FileModal
                basePath={currentPath}
                show={showFileModal}
                setShow={setShowFileModal}
                onSuccess={handleModalSuccess}
                onCreateFile={onCreateFile}
            />
            <FolderModal
                basePath={currentPath}
                show={showFolderModal}
                setShow={setShowFolderModal}
                onSuccess={handleModalSuccess}
                onCreateFolder={onCreateFolder}
            />
            <UploadModal
                basePath={currentPath}
                show={showUploadModal}
                setShow={setShowUploadModal}
                onSuccess={handleModalSuccess}
                onCreateFile={onCreateFile}
            />
        </div >
    );
};