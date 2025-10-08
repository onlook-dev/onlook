'use client';

import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { useEffect, useState } from 'react';
import type { EditorFile } from '../shared/types';
import { isDirty } from '../shared/utils';

export interface FileTabProps {
    file: EditorFile;
    isActive: boolean;
    onClick: () => void;
    onClose: () => void;
    dataActive: boolean;
}

export const FileTab = ({
    file,
    isActive,
    onClick,
    onClose,
    dataActive,
}: FileTabProps) => {
    const [isFileDirty, setIsFileDirty] = useState(false);
    const filename = file.path.split('/').pop() || '';

    useEffect(() => {
        isDirty(file).then(setIsFileDirty);
    }, [file.path, file.content, file.type, file.type === 'text' ? file.originalHash : null]);

    return (
        <div className="h-full pl-3 pr-3 relative group min-w-28 overflow-hidden" data-active={dataActive}>
            <div className="absolute right-0 h-[50%] w-[0.5px] bg-foreground/10 top-1/2 -translate-y-1/2"></div>
            <div className="flex items-center h-full relative overflow-hidden">
                <button
                    className={cn(
                        'text-sm h-full flex items-center focus:outline-none min-w-0 flex-1',
                        isActive
                            ? isFileDirty
                                ? 'text-teal-300'
                                : 'text-foreground'
                            : isFileDirty
                                ? 'text-teal-500'
                                : 'text-foreground-secondary/50',
                    )}
                    onClick={onClick}
                >
                    <span className="truncate min-w-0">{filename}</span>
                    {isFileDirty && (
                        <span className={cn(
                            "ml-1 flex-shrink-0",
                            isActive ? "text-teal-300" : "text-teal-500"
                        )}>
                            ●
                        </span>
                    )}
                    {isActive && (
                        <div className={cn(
                            "absolute bottom-0 left-0 w-full h-[2px]",
                            isFileDirty ? "bg-teal-300" : "bg-foreground-hover"
                        )}></div>
                    )}
                    {!isActive && (
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-foreground-tertiary/50 opacity-0 group-hover:opacity-100"></div>
                    )}
                </button>
                <div className="absolute right-[-3px] top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity group-hover:bg-background-primary rounded-md">
                    <button
                        className={cn(
                            "cursor-pointer p-1.5 flex-shrink-0 hover:text-foreground-hover hover:bg-secondary hover:rounded-md",
                            isActive ? "text-foreground-secondary" : "text-foreground-primary"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose?.();
                        }}
                    >
                        <Icons.CrossS className="h-3 w-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};
