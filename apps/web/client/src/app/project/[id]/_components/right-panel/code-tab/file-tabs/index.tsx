'use client'

import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { pathsEqual } from '@onlook/utility';
import { useEffect, useRef } from 'react';
import type { EditorFile } from '../shared/types';
import { FileTab } from './file-tab';

interface FileTabsProps {
    openedFiles: EditorFile[];
    activeFile: EditorFile | null;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isSidebarOpen: boolean) => void;
    onFileSelect: (file: EditorFile) => void;
    onCloseFile: (fileId: string) => void;
    onCloseAllFiles: () => void;
}

export const FileTabs = ({
    openedFiles,
    activeFile,
    isSidebarOpen,
    setIsSidebarOpen,
    onFileSelect,
    onCloseFile,
    onCloseAllFiles,
}: FileTabsProps) => {
    const ref = useRef<HTMLDivElement>(null);

    // Scroll to active tab when it changes
    useEffect(() => {
        const container = ref.current;
        if (!container || !activeFile?.path) return;

        // Wait for the file tabs to be rendered
        setTimeout(() => {
            const activeTab = container.querySelector('[data-active="true"]');
            if (activeTab) {
                const containerRect = container.getBoundingClientRect();
                const tabRect = activeTab.getBoundingClientRect();

                // Calculate if the tab is outside the visible area
                if (tabRect.left < containerRect.left) {
                    // Tab is to the left of the visible area
                    container.scrollLeft += tabRect.left - containerRect.left;
                } else if (tabRect.right > containerRect.right) {
                    // Tab is to the right of the visible area
                    container.scrollLeft += tabRect.right - containerRect.right;
                }
            }
        }, 100);
    }, [activeFile?.path]);

    return (
        <div className="flex items-center justify-between h-11 pl-0 border-b-[0.5px] flex-shrink-0 relative">
            <div className="absolute left-0 top-0 bottom-0 z-20 border-r-[0.5px] h-full flex items-center p-1 bg-background">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            {isSidebarOpen ? <Icons.SidebarLeftCollapse /> : <Icons.SidebarLeftExpand />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="mt-1" hideArrow>
                        {isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    </TooltipContent>
                </Tooltip>
            </div>
            <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center h-full border-l-[0.5px] p-1 bg-background w-11">
                <DropdownMenu>
                    <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 p-1 rounded h-full w-full flex items-center justify-center px-2.5">
                        <Icons.DotsHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="-mt-1">
                        <DropdownMenuItem
                            onClick={() => activeFile && onCloseFile(activeFile.path)}
                            disabled={!activeFile}
                            className="cursor-pointer"
                        >
                            Close file
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={onCloseAllFiles}
                            disabled={openedFiles.length === 0}
                            className="cursor-pointer"
                        >
                            Close all
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex items-center h-full overflow-x-auto w-full ml-11 mr-10.5" ref={ref}>
                {openedFiles.map((file) => (
                    <FileTab
                        key={file.path}
                        file={file}
                        isActive={pathsEqual(activeFile?.path, file.path)}
                        onClick={() => onFileSelect(file)}
                        onClose={() => onCloseFile(file.path)}
                        dataActive={pathsEqual(activeFile?.path, file.path)}
                    />
                ))}
            </div>
        </div>
    );
};