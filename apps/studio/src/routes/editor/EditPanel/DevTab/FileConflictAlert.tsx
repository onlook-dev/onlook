import React from 'react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

interface FileConflictAlertProps {
    filename: string;
    onUseExternalChanges: () => void;
    onKeepLocalChanges: () => void;
}

export const FileConflictAlert: React.FC<FileConflictAlertProps> = ({
    filename,
    onUseExternalChanges,
    onKeepLocalChanges,
}) => {
    return (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
                <Icons.File className="text-amber-500 h-5 w-5" />
                <span className="text-sm">
                    <strong>{filename}</strong> has been modified outside the editor.
                </span>
            </div>
            <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={onKeepLocalChanges}>
                    Keep my changes
                </Button>
                <Button variant="default" size="sm" onClick={onUseExternalChanges}>
                    Use external changes
                </Button>
            </div>
        </div>
    );
};
