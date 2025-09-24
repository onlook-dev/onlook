import { useCallback, useMemo } from 'react';
import { observer } from 'mobx-react-lite';

import type { FolderNode, ImageContentData } from '@onlook/models';
import { EditorTabValue } from '@onlook/models';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';

import { useEditorEngine } from '@/components/store/editor';
import { useImageDragDrop } from './hooks/use-image-drag-drop';
import { ImageDropdownMenu } from './image-dropdown-menu';
import { useImagesContext } from './providers/images-provider';

export const ImageItem = observer(({ image }: { image: ImageContentData }) => {
    const editorEngine = useEditorEngine();
    const { onImageDragStart, onImageDragEnd, onImageMouseDown, onImageMouseUp } =
        useImageDragDrop();
    const { renameOperations, deleteOperations, moveOperations, isOperating } = useImagesContext();

    const selectedImage = editorEngine.image.selectedImage;
    const isSelectingImage = editorEngine.image.isSelectingImage;
    const previewImage = editorEngine.image.previewImage;

    const { renameState, handleRenameImage, handleRenameModalToggle, handleRenameInputBlur } =
        renameOperations;

    const { handleDeleteImage } = deleteOperations;

    const { moveState, handleSelectTargetFolder, handleMoveImage } = moveOperations;

    const isImageRenaming = renameState.imageToRename === image.fileName;
    const isSelected = selectedImage?.originPath === image.originPath;
    const isDisabled = isOperating;

    const handleMoveToFolder = useCallback(
        (targetFolder: FolderNode) => {
            if (!isDisabled) {
                handleMoveImage(image, targetFolder);
            }
        },
        [handleMoveImage, image, isDisabled],
    );

    const handleOpenFolder = useCallback(async () => {
        if (!image.originPath) {
            return;
        }
        editorEngine.state.rightPanelTab = EditorTabValue.DEV;

        await editorEngine.ide.openFile(image.originPath);
    }, [editorEngine.state, editorEngine.ide, image.originPath]);

    const handleDragStart = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            if (isDisabled) {
                e.preventDefault();
                return;
            }
            onImageDragStart(e, image);
        },
        [onImageDragStart, image, isDisabled],
    );

    const handleRenameBlur = useCallback(
        (e: React.FocusEvent<HTMLInputElement>) => {
            handleRenameInputBlur(e.target.value);
        },
        [handleRenameInputBlur],
    );

    const handleRenameKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.currentTarget.blur();
            }
            if (e.key === 'Escape') {
                handleRenameModalToggle();
            }
        },
        [handleRenameModalToggle],
    );

    const handleRename = useCallback(() => {
        if (!isDisabled) {
            handleRenameImage(image);
        }
    }, [handleRenameImage, image, isDisabled]);

    const handleDelete = useCallback(() => {
        if (!isDisabled) {
            handleDeleteImage(image);
        }
    }, [handleDeleteImage, image, isDisabled]);

    const handleMouseDown = useCallback(() => {
        if (!isDisabled) {
            onImageMouseDown();
        }
    }, [onImageMouseDown, isDisabled]);

    const handleMouseUp = useCallback(() => {
        if (!isDisabled) {
            onImageMouseUp();
        }
    }, [onImageMouseUp, isDisabled]);

    const handleMouseEnter = useCallback(() => {
        if (!isDisabled && isSelectingImage) {
            editorEngine.image.setPreviewImage(image);
        }
    }, [isDisabled, isSelectingImage, editorEngine.image, image]);

    const handleMouseLeave = useCallback(() => {
        if (!isDisabled && isSelectingImage) {
            editorEngine.image.setPreviewImage(null);
        }
    }, [isDisabled, isSelectingImage, editorEngine.image]);

    const handleClick = useCallback(() => {
        if (!isDisabled && isSelectingImage) {
            editorEngine.image.setSelectedImage(image);
        }
    }, [isDisabled, isSelectingImage, image, editorEngine.image]);

    const defaultValue = useMemo(() => {
        return image.fileName.replace(/\.[^/.]+$/, '');
    }, [image.fileName]);

    return (
        <div
            className={cn('group relative w-full', isDisabled && 'pointer-events-none opacity-50')}
            draggable={!isDisabled}
            onDragStart={handleDragStart}
            onDragEnd={onImageDragEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        >
            <div
                className={cn(
                    'border-border flex aspect-square w-full cursor-move flex-col items-center justify-center overflow-hidden rounded-lg border-[0.5px]',
                    isSelected && 'cursor-pointer rounded-xl border-2 border-red-500 p-1.5',
                    previewImage?.originPath === image.originPath &&
                        'cursor-pointer rounded-xl border-2 border-red-500 p-1.5',
                )}
            >
                <img
                    className="h-full w-full rounded-lg object-cover"
                    src={image.content}
                    alt={image.fileName}
                />
            </div>
            <span className="mt-1 block w-full truncate text-center text-xs">
                {isImageRenaming ? (
                    <input
                        type="text"
                        className="bg-background-active w-full rounded p-1 text-center"
                        defaultValue={defaultValue}
                        autoFocus
                        onBlur={handleRenameBlur}
                        onKeyDown={handleRenameKeyDown}
                        disabled={isDisabled}
                    />
                ) : (
                    image.fileName
                )}
            </span>
            {!isSelectingImage && (
                <ImageDropdownMenu
                    image={image}
                    handleRenameImage={handleRename}
                    handleDeleteImage={handleDelete}
                    handleOpenFolder={handleOpenFolder}
                    handleMoveToFolder={handleMoveToFolder}
                    isDisabled={isDisabled}
                    selectedTargetFolder={moveState.targetFolder}
                    onSelectTargetFolder={handleSelectTargetFolder}
                />
            )}
            {isSelected && (
                <div className="bg-black-85 absolute right-2.5 bottom-7.5 rounded-lg p-1">
                    <Icons.CheckCircled className="h-3 w-3" />
                </div>
            )}
        </div>
    );
});
