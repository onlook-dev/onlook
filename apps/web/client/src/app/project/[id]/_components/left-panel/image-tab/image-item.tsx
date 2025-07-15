import { useEditorEngine } from '@/components/store/editor';
import { EditorTabValue, type ImageContentData, type FolderNode } from '@onlook/models';
import { cn } from '@onlook/ui/utils';
import { memo, useCallback, useMemo } from 'react';
import { useImageDragDrop } from './hooks/use-image-drag-drop';
import { ImageDropdownMenu } from './image-dropdown-menu';
import { useImagesContext } from './providers/images-provider';

export const ImageItem = memo(({ image }: { image: ImageContentData }) => {
    const editorEngine = useEditorEngine();
    const { onImageDragStart, onImageDragEnd, onImageMouseDown, onImageMouseUp } = useImageDragDrop();
    const { renameOperations, deleteOperations, moveOperations, isOperating } = useImagesContext();

    const {
        renameState,
        handleRenameImage,
        handleRenameModalToggle,
        handleRenameInputBlur,
    } = renameOperations;

    const {
        handleDeleteImage
    } = deleteOperations;

    const {
        moveState,
        handleSelectTargetFolder,
        handleMoveImage,
    } = moveOperations;

    const isImageRenaming = renameState.imageToRename === image.fileName;
    const isDisabled = isOperating;

    const handleMoveToFolder = useCallback((targetFolder: FolderNode) => {
        if (!isDisabled) {
            handleMoveImage(image, targetFolder);
        }
    }, [handleMoveImage, image, isDisabled]);

    const handleOpenFolder = useCallback(
        async () => {
            if (!image.originPath) {
                return;
            }
            editorEngine.state.rightPanelTab = EditorTabValue.DEV;

            await editorEngine.ide.openFile(image.originPath);
        },
        [editorEngine.state, editorEngine.ide, image.originPath],
    );

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
        >
            <div className="w-full aspect-square flex flex-col justify-center rounded-lg overflow-hidden items-center cursor-move border-[0.5px] border-border">
                <img
                    className="w-full h-full object-cover"
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
        </div>
    );
});