import { useCallback, useEffect, useState } from 'react';
import { type ImageContentData } from '@onlook/models';
import { useEditorEngine } from '@/components/store/editor';

interface RenameState {
    imageToRename: string | null;
    originImagePath: string | null;
    newImageName: string;
    error: string | null;
    isLoading: boolean;
}

export const useImageRename = () => {
    const editorEngine = useEditorEngine();
    
    const [renameState, setRenameState] = useState<RenameState>({
        imageToRename: null,
        originImagePath: null,
        newImageName: '',
        error: null,
        isLoading: false,
    });

    const handleRenameImage = useCallback((image: ImageContentData) => {
        setRenameState({
            imageToRename: image.fileName,
            newImageName: image.fileName,
            originImagePath: image.originPath,
            error: null,
            isLoading: false,
        });
    }, []);

    const handleRenameInputBlur = useCallback(
        (value: string) => {
            if (value.trim() === '') {
                setRenameState((prev) => ({ ...prev, error: 'Image name cannot be empty' }));
                return;
            }
            if (renameState.imageToRename) {
                const extension = renameState.imageToRename.split('.').pop() ?? '';
                const newBaseName = value.replace(`.${extension}`, '');
                const proposedNewName = `${newBaseName}.${extension}`;

                if (proposedNewName !== renameState.imageToRename) {
                    setRenameState((prev) => ({ ...prev, newImageName: proposedNewName }));
                } else {
                    setRenameState({
                        imageToRename: null,
                        originImagePath: null,
                        newImageName: '',
                        error: null,
                        isLoading: false,
                    });
                }
            } else {
                setRenameState({
                    imageToRename: null,
                    originImagePath: null,
                    newImageName: '',
                    error: null,
                    isLoading: false,
                });
            }
        },
        [renameState.imageToRename],
    );

    const onRenameImage = useCallback(
        async (newName: string) => {
            setRenameState((prev) => ({ ...prev, isLoading: true }));
            try {
                if (
                    renameState.originImagePath &&
                    newName &&
                    newName !== renameState.imageToRename
                ) {
                    await editorEngine.image.rename(renameState.originImagePath, newName);
                }
                setRenameState({
                    imageToRename: null,
                    originImagePath: null,
                    newImageName: '',
                    error: null,
                    isLoading: false,
                });
            } catch (error) {
                setRenameState((prev) => ({
                    ...prev,
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Failed to rename image. Please try again.',
                    isLoading: false,
                }));
                console.error('Image rename error:', error);
            }
        },
        [renameState.originImagePath, renameState.imageToRename, editorEngine.image],
    );

    const handleRenameModalToggle = useCallback(() => {
        setRenameState({
            imageToRename: null,
            originImagePath: null,
            newImageName: '',
            error: null,
            isLoading: false,
        });
    }, []);

    useEffect(() => {
        if (renameState.error) {
            const timer = setTimeout(() => {
                setRenameState((prev) => ({ ...prev, error: null }));
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [renameState.error]);

    return {
        renameState,
        handleRenameImage,
        handleRenameInputBlur,
        onRenameImage,
        handleRenameModalToggle,
    };
}; 