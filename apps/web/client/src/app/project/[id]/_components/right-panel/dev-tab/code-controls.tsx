import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { TooltipArrow } from '@radix-ui/react-tooltip';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { FileModal } from './file-modal';
import { FolderModal } from './folder-modal';
import { cn } from '@onlook/ui/utils';

export const CodeControls = observer(() => {
    const editorEngine = useEditorEngine();
    const [fileModalOpen, setFileModalOpen] = useState(false);
    const [folderModalOpen, setFolderModalOpen] = useState(false);
    const isDirty = editorEngine.ide.activeFile?.isDirty ?? false;

    const saveFile = () => {
        editorEngine.ide.saveActiveFile();
    };

    const basePath = editorEngine.ide.activeFile?.path ?? '';
    const files = editorEngine.ide.files;

    return (
        <>
            <div className="flex flex-row opacity-50 transition-opacity duration-200 group-hover/panel:opacity-100">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setFileModalOpen(true)}
                            className="p-2 w-fit h-fit hover:bg-background-onlook cursor-pointer"
                        >
                            <Icons.FilePlus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" hideArrow>
                        <p>New File</p>
                        <TooltipArrow className="fill-foreground" />
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setFolderModalOpen(true)}
                            className="p-2 w-fit h-fit hover:bg-background-onlook cursor-pointer"
                        >
                            <Icons.DirectoryPlus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" hideArrow>
                        <p>New Folder</p>
                        <TooltipArrow className="fill-foreground" />
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={saveFile}
                            disabled={!isDirty}
                            className={cn(
                                "p-2 w-fit h-fit cursor-pointer",
                                isDirty 
                                    ? "text-teal-200 hover:text-teal-100 hover:bg-teal-500" 
                                    : "hover:bg-background-onlook hover:text-teal-200"
                            )}
                        >
                            <Icons.Save className={cn(
                                "h-4 w-4",
                                isDirty && "text-teal-200 group-hover:text-teal-100"
                            )} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" hideArrow>
                        <p>Save changes</p>
                        <TooltipArrow className="fill-foreground" />
                    </TooltipContent>
                </Tooltip>
            </div>
            <FileModal 
                open={fileModalOpen} 
                onOpenChange={setFileModalOpen} 
                basePath={basePath}
                files={files}
            />
            <FolderModal 
                open={folderModalOpen} 
                onOpenChange={setFolderModalOpen} 
                basePath={basePath}
                files={files}
            />
        </>
    );
}); 