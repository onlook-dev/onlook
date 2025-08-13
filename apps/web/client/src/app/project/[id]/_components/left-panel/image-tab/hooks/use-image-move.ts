import { useEditorEngine } from '@/components/store/editor';
import { type FolderNode, type ImageContentData } from '@onlook/models';
import { ensureImageFolderPrefix, generateNewFolderPath } from '@onlook/utility';
import { useCallback, useEffect, useState } from 'react';

interface MoveImageState {
    targetFolder: FolderNode | null;
    imageToMove: ImageContentData | null;
    isLoading: boolean;
    error: string | null;
}

export const useImageMove = () => {
    const editorEngine = useEditorEngine();

    const [moveState, setMoveState] = useState<MoveImageState>({
        targetFolder: null,
        imageToMove: null,
        isLoading: false,
        error: null,
    });

    const handleSelectTargetFolder = useCallback((folder: FolderNode) => {
        setMoveState((prev) => ({
            ...prev,
            targetFolder: folder,
            error: null,
        }));
    }, []);

    const handleMoveImage = useCallback((image: ImageContentData, targetFolder: FolderNode) => {
        setMoveState({
            targetFolder,
            imageToMove: image,
            isLoading: false,
            error: null,
        });
    }, []);

    const moveImageToFolder = useCallback(async () => {
        if (!moveState.imageToMove || !moveState.targetFolder) {
            return;
        }

        const image = moveState.imageToMove;
        const targetFolder = moveState.targetFolder;

        setMoveState((prev) => ({ ...prev, isLoading: true, error: null }));
        try {
            const fileName = image.fileName;
            const currentPath = image.originPath;
            // Construct new path based on target folder
            const newPath = generateNewFolderPath(
                currentPath,
                fileName,
                'move',
                targetFolder.fullPath,
            );
            const fullPath = ensureImageFolderPrefix(newPath);

            // Don't move if it's already in the same location
            if (currentPath === fullPath) {
                setMoveState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: 'Image is already in the selected folder',
                }));
                return;
            }

            const copied = await editorEngine.sandbox.copy(currentPath, fullPath, true);
            if (!copied) {
                throw new Error('Failed to copy image');
            }
            const deleted = await editorEngine.sandbox.delete(currentPath);
            if (!deleted) {
                throw new Error('Failed to delete image');
            }
            await editorEngine.image.scanImages();

            setMoveState({
                targetFolder: null,
                imageToMove: null,
                isLoading: false,
                error: null,
            });
        } catch (error) {
            setMoveState((prev) => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to move image',
                isLoading: false,
            }));
            console.error('Image move error:', error);
        }
    }, [editorEngine, moveState.imageToMove, moveState.targetFolder]);

    const handleMoveModalToggle = useCallback(() => {
        setMoveState({
            targetFolder: null,
            imageToMove: null,
            isLoading: false,
            error: null,
        });
    }, []);

    const clearError = useCallback(() => {
        setMoveState((prev) => ({ ...prev, error: null }));
    }, []);

    useEffect(() => {
        if (moveState.error) {
            const timer = setTimeout(() => {
                setMoveState((prev) => ({ ...prev, error: null }));
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [moveState.error]);

    return {
        moveState,
        handleSelectTargetFolder,
        handleMoveImage,
        moveImageToFolder,
        handleMoveModalToggle,
        clearError,
    };
};
