import { observer } from 'mobx-react-lite';

import { Icons } from '@onlook/ui/icons';

import { useEditorEngine } from '@/components/store/editor';
import Folder from './folder';
import { FolderProvider } from './providers/folder-provider';
import { ImagesProvider, useImagesContext } from './providers/images-provider';

export const ImagesTab = () => {
    return (
        <ImagesProvider>
            <FolderProvider>
                <ImagesTabContent />
            </FolderProvider>
        </ImagesProvider>
    );
};

const ImagesTabContent = observer(() => {
    const editorEngine = useEditorEngine();
    const isIndexing = editorEngine.activeSandbox.isIndexing;
    const {
        renameOperations: { renameState },
        uploadOperations,
    } = useImagesContext();

    if (isIndexing) {
        return (
            <div className="flex h-full w-full items-center justify-center gap-2">
                <Icons.Reload className="h-4 w-4 animate-spin" />
                Indexing images...
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col gap-2 overflow-x-hidden p-3">
            {uploadOperations.uploadState.error && (
                <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-950/50">
                    {uploadOperations.uploadState.error}
                </div>
            )}
            {renameState.error && (
                <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-950/50">
                    {renameState.error}
                </div>
            )}
            <Folder />
        </div>
    );
});
