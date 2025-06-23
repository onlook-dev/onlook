import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import DeleteImageModal from './delete-modal';
import RenameImageModal from './rename-modal';
import Folder from './folder';
import { ImagesProvider, useImagesContext } from './providers/images-provider';
import { useImageDragDrop } from './hooks/use-image-drag-drop';

export const ImagesTab = observer(() => {
    return (
        <ImagesProvider>
            <ImagesTabContent />
        </ImagesProvider>
    );
});

const ImagesTabContent = observer(() => {
    
    const { deleteOperations, renameOperations, uploadOperations, folderStructure, isOperating } = useImagesContext();
    const { deleteState, onDeleteImage, handleDeleteModalToggle } = deleteOperations;

    const {
        renameState,
        onRenameImage,
        handleRenameModalToggle
    } = renameOperations;

    const {
        isDragging,
        handleDrop,
        handleDragOver,
        handleDragEnter,
        handleDragLeave,
    } = useImageDragDrop();


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

                {!isOperating && (
                    <div
                        className={cn(
                            'flex-1 overflow-y-auto',
                            '[&[data-dragging-image=true]]:bg-teal-500/40',
                            isDragging && 'cursor-copy',
                            isOperating && 'pointer-events-none opacity-75',
                        )}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                    >
                        <Folder folderStructure={folderStructure} />
                    </div>
                )}
                <DeleteImageModal
                    onDelete={onDeleteImage}
                    isOpen={!!deleteState.imageToDelete}
                    toggleOpen={handleDeleteModalToggle}
                    isLoading={deleteState.isLoading}
                />
                <RenameImageModal
                    onRename={onRenameImage}
                    isOpen={
                        !!renameState.imageToRename &&
                        !!renameState.newImageName &&
                        renameState.newImageName !== renameState.imageToRename
                    }
                    toggleOpen={handleRenameModalToggle}
                    newName={renameState.newImageName}
                    isLoading={renameState.isLoading}
                />
            </div>
        </ImagesProvider>
    );
});
