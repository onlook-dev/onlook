import React, { memo } from 'react';
import type { ImageContentData } from '@onlook/models';
import { ImageItem } from './image-item';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { useImagesContext } from './providers/images-provider';
import DeleteImageModal from './delete-modal';
import RenameImageModal from './rename-modal';

interface ImageListProps {
    images: ImageContentData[];
}

export const ImageList = memo(({ images }: ImageListProps) => {
    const { uploadOperations, deleteOperations, renameOperations } = useImagesContext();
    const { handleClickAddButton, handleUploadFile } = uploadOperations;
    const { deleteState, onDeleteImage, handleDeleteModalToggle } = deleteOperations;
    const { renameState, onRenameImage, handleRenameModalToggle } = renameOperations;

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-200 font-medium">Images</p>
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
            <div className="w-full grid grid-cols-2 gap-3 p-0">
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="images-upload"
                    onChange={handleUploadFile}
                    multiple
                    // disabled={isAnyOperationLoading}
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
        </div>
    );
});
