import { Icons } from '@onlook/ui/icons';
import { useState } from 'react';
import Folder from './folder';

// Stub data at top level
const stubFolders: any[] = [];
const stubImages: any[] = [];

// Stub handlers
const stubHandlers = {
    handleCreateFolder: () => {},
    handleRenameFolder: () => {},
    handleDeleteFolder: () => {},
    handleMoveToFolder: () => {},
    handleRenameImage: () => {},
    handleDeleteImage: () => {},
    handleMoveImageToFolder: () => {},
    handleUpload: () => {},
    handleRefresh: () => {},
    getChildFolders: () => stubFolders,
    getImagesInFolder: () => stubImages,
};

export const ImagesTab = () => {
    const [isReady, setIsReady] = useState(true);
    const [error, setError] = useState<string | null>(null);

    if (!isReady) {
        return (
            <div className="w-full h-full flex items-center justify-center gap-2">
                <Icons.Reload className="w-4 h-4 animate-spin" />
                Indexing images...
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col gap-2 p-3 overflow-x-hidden">
            {error && (
                <div className="mb-2 px-3 py-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
                    {error}
                </div>
            )}
            <Folder handlers={stubHandlers} />
        </div>
    );
};
