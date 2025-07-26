import { useEditorEngine } from '@/components/store/editor';
import { EditorTabValue, type ImageContentData, type FolderNode } from '@onlook/models';
import { cn } from '@onlook/ui/utils';
import { useCallback, useMemo } from 'react';
import { useImageDragDrop } from './hooks/use-image-drag-drop';
import { ImageDropdownMenu } from './image-dropdown-menu';
import { useImagesContext } from './providers/images-provider';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';

export const ImageItem = observer(({ image }: { image: ImageContentData }) => {
    const editorEngine = useEditorEngine();
    const { onImageDragStart, onImageDragEnd, onImageMouseDown, onImageMouseUp } =
        useImageDragDrop();
    const {
        renameOperations,
        deleteOperations,
        moveOperations,
        isOperating,
    } = useImagesContext();
    
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
            className={cn('relative group w-full', isDisabled && 'opacity-50 pointer-events-none')}
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
                    'w-full aspect-square flex flex-col justify-center rounded-lg overflow-hidden items-center cursor-move border-[0.5px] border-border',
                    isSelected && 'border-2 border-red-500 p-1.5 rounded-xl cursor-pointer',
                    previewImage?.originPath === image.originPath && 'border-2 border-red-500 p-1.5 rounded-xl cursor-pointer',
                )}
            >
                <img
                    className="w-full h-full object-cover rounded-lg"
                    src={image.content}
                    alt={image.fileName}
                />
            </div>
            <span className="text-xs block w-full text-center truncate mt-1">
                {isImageRenaming ? (
                    <input
                        type="text"
                        className="w-full p-1 text-center bg-background-active rounded "
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
                <div className="bg-black-85 rounded-lg absolute bottom-7.5 right-2.5 p-1">
                    <Icons.CheckCircled className="w-3 h-3" />
                </div>
            )}
        </div>
    );
});

