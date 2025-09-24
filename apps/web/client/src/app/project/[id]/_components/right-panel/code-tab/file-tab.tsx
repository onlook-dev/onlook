import React from 'react';

import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

export interface FileTabProps {
    filename: string;
    isActive?: boolean;
    isDirty?: boolean;
    onClick?: () => void;
    onClose?: () => void;
    'data-active'?: boolean;
}

export const FileTab: React.FC<FileTabProps> = ({
    filename,
    isActive = false,
    isDirty = false,
    onClick,
    onClose,
    'data-active': dataActive,
}) => {
    return (
        <div className="group relative h-full pr-3 pl-3" data-active={dataActive}>
            <div className="bg-foreground/10 absolute top-1/2 right-0 h-[50%] w-[0.5px] -translate-y-1/2"></div>
            <div className="relative flex h-full items-center">
                <button
                    className={cn(
                        'flex h-full max-w-[150px] items-center text-sm focus:outline-none',
                        isActive
                            ? isDirty
                                ? 'text-teal-300'
                                : 'text-foreground'
                            : isDirty
                              ? 'text-teal-500'
                              : 'text-foreground-secondary/50',
                    )}
                    onClick={onClick}
                >
                    <span className="truncate">{filename}</span>
                    {isDirty && (
                        <span
                            className={cn(
                                'ml-1 flex-shrink-0',
                                isActive ? 'text-teal-300' : 'text-teal-500',
                            )}
                        >
                            ●
                        </span>
                    )}
                    {isActive && (
                        <div
                            className={cn(
                                'absolute bottom-0 left-0 h-[2px] w-full',
                                isDirty ? 'bg-teal-300' : 'bg-foreground-hover',
                            )}
                        ></div>
                    )}
                    {!isActive && (
                        <div className="bg-foreground-tertiary/50 absolute bottom-0 left-0 h-[2px] w-full opacity-0 group-hover:opacity-100"></div>
                    )}
                </button>
                <div className="group-hover:bg-background-primary absolute top-1/2 right-[-3px] z-10 -translate-y-1/2 rounded-md opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                        className={cn(
                            'hover:text-foreground-hover hover:bg-secondary flex-shrink-0 cursor-pointer p-1.5 hover:rounded-md',
                            isActive ? 'text-foreground-secondary' : 'text-foreground-primary',
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
