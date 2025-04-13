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
        <div className="h-full px-4 relative group">
            <div className="absolute right-0 h-[50%] w-[0.5px] bg-foreground/10 top-1/2 -translate-y-1/2"></div>
            <div className="flex items-center h-full">
                <button
                    className={cn(
                        'text-sm h-full flex items-center focus:outline-none max-w-[150px]',
                        isActive
                            ? 'text-foreground-hover'
                            : 'text-foreground hover:text-foreground-hover',
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
                <button
                    className="ml-2 cursor-pointer text-foreground flex-shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose?.();
                    }}
                >
                    <Icons.CrossS className="h-3 w-3" />
                </button>
            </div>
        </div>
    );
};
