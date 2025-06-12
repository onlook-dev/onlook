import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import React from 'react';

export interface FileTabProps {
    filename: string;
    isActive?: boolean;
    isDirty?: boolean;
    onClick?: () => void;
    onClose?: () => void;
}

export const FileTab: React.FC<FileTabProps> = ({
    filename,
    isActive = false,
    isDirty = false,
    onClick,
    onClose,
}) => {
    return (
        <div className="h-full pl-3 pr-3 relative group">
            <div className="absolute right-0 h-[50%] w-[0.5px] bg-foreground/10 top-1/2 -translate-y-1/2"></div>
            <div className="flex items-center h-full relative">
                <button
                    className={cn(
                        'text-sm h-full flex items-center focus:outline-none max-w-[150px]',
                        isActive
                            ? 'text-foreground'
                            : 'text-foreground-secondary/50 hover:text-foreground-hover',
                    )}
                    onClick={onClick}
                >
                    <span className="truncate">{filename}</span>
                    {isDirty && (
                        <span className="ml-1 flex-shrink-0 text-foreground-hover text-white">
                            ●
                        </span>
                    )}
                    {isActive && (
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-foreground-hover"></div>
                    )}
                </button>
                <div className="absolute right-[-3px] top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity group-hover:bg-background-primary rounded-md">
                    <button
                        className={cn(
                            "cursor-pointer p-1.5 flex-shrink-0 hover:text-foreground-hover hover:bg-secondary hover:rounded-md",
                            isActive ? "text-foreground" : "text-foreground"
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
