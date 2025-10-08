import { useEditorEngine } from '@/components/store/editor';
import { MessageContextType } from '@onlook/models/chat';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { useState } from 'react';
import { FileModal } from './modals/file-modal';
import { FolderModal } from './modals/folder-modal';
import { UploadModal } from './modals/upload-modal';

interface CodeControlsProps {
    isDirty: boolean;
    currentPath: string;
    currentFilePath: string | null;
    currentFileContent: string | null;
    branchId: string;
    onSave: () => Promise<void>;
    onRefresh: () => void;
    onCreateFile: (filePath: string, content?: string) => Promise<void>;
    onCreateFolder: (folderPath: string) => Promise<void>;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isSidebarOpen: boolean) => void;
    selection?: { from: number; to: number; text: string } | null;
}

export const CodeControls = ({ isDirty, currentPath, currentFilePath, currentFileContent, branchId, onSave, onRefresh, onCreateFile, onCreateFolder, isSidebarOpen, setIsSidebarOpen, selection }: CodeControlsProps) => {
    const editorEngine = useEditorEngine();
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

    const handleAddSelectionToChat = async () => {
        if (!selection || !currentFilePath || !currentFileContent) return;

        try {
            // Calculate line numbers from character positions
            const beforeSelection = currentFileContent.substring(0, selection.from);
            const selectionContent = currentFileContent.substring(selection.from, selection.to);
            const startLine = beforeSelection.split('\n').length;
            const endLine = startLine + selectionContent.split('\n').length - 1;

            const fileName = currentFilePath.split('/').pop() || currentFilePath;
            // Add highlight context (selected code snippet)
            editorEngine.chat.context.addContexts([{
                type: MessageContextType.HIGHLIGHT,
                path: currentFilePath,
                content: selection.text,
                displayName: fileName + ' (' + startLine + ':' + endLine + ')',
                start: startLine,
                end: endLine,
                branchId: branchId,
            }]);

            // Also add full file context
            editorEngine.chat.context.addContexts([{
                type: MessageContextType.FILE,
                path: currentFilePath,
                content: currentFileContent,
                displayName: currentFilePath.split('/').pop() || currentFilePath,
                branchId: branchId,
            }]);

            toast.success('Selection added to chat');
        } catch (error) {
            console.error('Failed to add selection to chat:', error);
            toast.error('Failed to add selection to chat');
        }
    };

    return (
        <div className="flex flex-row items-center justify-between p-1 px-2 border-b border-border w-full h-10">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {isSidebarOpen ? <Icons.SidebarLeftCollapse /> : <Icons.MoveToFolder />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="mt-1" hideArrow>
                    {isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                </TooltipContent>
            </Tooltip>
            <div className="flex flex-row items-center transition-opacity duration-200 ml-auto">

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
                            onClick={handleSave}
                            disabled={!isDirty || isSaving}
                            className={cn(
                                "px-1.5 py-0.75 w-fit h-fit cursor-pointer mr-0.5 ml-1",
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
                {selection && currentFilePath && currentFileContent && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "px-1.5 py-0.75 w-fit h-fit cursor-pointer mr-0.5 ml-1"
                                )}
                                onClick={handleAddSelectionToChat}
                            >
                                <Icons.Sparkles className="h-4 w-4 " />
                                <span className="text-small">Add to Chat</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" hideArrow>
                            <p>Add selection to chat</p>
                        </TooltipContent>
                    </Tooltip>
                )}
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