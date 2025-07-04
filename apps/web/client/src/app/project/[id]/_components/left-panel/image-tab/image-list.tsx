import React, { memo, useCallback } from 'react';
import type { ImageContentData } from '@onlook/models';
import { ImageItem } from './image-item';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { useImagesContext } from './providers/images-provider';
import DeleteImageModal from './delete-modal';
import RenameImageModal from './rename-modal';
import MoveImageModal from './move-modal';
import { useImageDragDrop } from './hooks/use-image-drag-drop';
import { cn } from '@onlook/ui/utils';

interface ImageListProps {
    images: ImageContentData[];
    currentFolder: string;
}

export const ImageList = memo(({ images, currentFolder }: ImageListProps) => {
    const { uploadOperations, deleteOperations, renameOperations, moveOperations } = useImagesContext();
    const { handleClickAddButton, handleUploadFile, uploadState } = uploadOperations;
    const { deleteState, onDeleteImage, handleDeleteModalToggle } = deleteOperations;
    const { renameState, onRenameImage, handleRenameModalToggle } = renameOperations;
    const { moveState, moveImageToFolder, handleMoveModalToggle } = moveOperations;
    const { handleDragEnter, handleDragLeave, handleDragOver, handleDrop, isDragging } = useImageDragDrop(currentFolder);


    return (
        <div className="flex flex-col gap-2 h-full">
            <p className="text-sm text-gray-200 font-medium">Images</p>
            {uploadState.isUploading && (
                <div className="mb-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/50 rounded-md flex items-center gap-2">
                    <Icons.Reload className="w-4 h-4 animate-spin" />
                    Uploading image...
                </div>
            )}
            {images.length === 0 && (
                <div className="h-full w-full flex items-center justify-center text-center opacity-70">
                    <Button
                        onClick={handleClickAddButton}
                        variant={'default'}
                        className="p-2.5 w-full h-fit gap-2 bg-gray-800 hover:bg-gray-700 text-white font-normal"
                    >
                        <Icons.Plus />
                        <span>Add an Image</span>
                    </Button>
                </div>
            )}
            <div
                className={cn(
                    'w-full grid grid-cols-2 gap-3 p-0 overflow-y-auto',
                    '[&[data-dragging-image=true]]:bg-teal-500/40',
                    isDragging && 'cursor-copy',
                )}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="images-upload"
                    onChange={(e) => handleUploadFile(e, currentFolder)}
                    multiple
                    disabled={uploadState.isUploading}
                />
                {images.map((image) => (
                    <ImageItem key={image.originPath} image={image} />
                ))}
            </div>
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
            <MoveImageModal
                onMove={moveImageToFolder}
                isOpen={!!moveState.imageToMove && !!moveState.targetFolder}
                toggleOpen={handleMoveModalToggle}
                isLoading={moveState.isLoading}
                image={moveState.imageToMove}
                targetFolder={moveState.targetFolder}
            />
        </div>
    );
});
