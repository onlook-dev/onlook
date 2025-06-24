import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import Folder from './folder';
import { ImagesProvider, useImagesContext } from './providers/images-provider';
import { useImageDragDrop } from './hooks/use-image-drag-drop';
import { useEditorEngine } from '@/components/store/editor';

export const ImagesTab = observer(() => {
    return (
        <ImagesProvider>
            <ImagesTabContent />
        </ImagesProvider>
    );
});

const ImagesTabContent = observer(() => {
    const { renameOperations, uploadOperations, isOperating } = useImagesContext();
    const editorEngine = useEditorEngine();
    const isIndexing = editorEngine.sandbox.isIndexingFiles;

    const { renameState } = renameOperations;

    if (isIndexing) {
        return (
            <div className="w-full h-full flex items-center justify-center gap-2">
                <Icons.Reload className="w-4 h-4 animate-spin" />
                Indexing images...
            </div>
        );
    }

    return (
        <ImagesProvider>
            <div className="w-full h-full flex flex-col gap-2 p-3 overflow-x-hidden">
                {uploadOperations.uploadState.error && (
                    <div className="mb-2 px-3 py-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
                        {uploadOperations.uploadState.error}
                    </div>
                )}
                {uploadOperations.uploadState.isUploading && (
                    <div className="mb-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/50 rounded-md flex items-center gap-2">
                        <Icons.Reload className="w-4 h-4 animate-spin" />
                        Uploading image...
                    </div>
                )}
                {renameState.error && (
                    <div className="mb-2 px-3 py-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
                        {renameState.error}
                    </div>
                )}
                {isOperating && (
                    <div className="mb-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/50 rounded-md flex items-center gap-2">
                        <Icons.Reload className="w-4 h-4 animate-spin" />
                        Updating images...
                    </div>
                )}

                {!isOperating && <Folder />}
            </div>
        </ImagesProvider>
    );
});
