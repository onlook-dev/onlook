import { useCallback, useState } from 'react';
import { type ImageContentData } from '@onlook/models';
import { useEditorEngine } from '@/components/store/editor';

interface DeleteState {
    imageToDelete: string | null;
    isLoading: boolean;
}

export const useImageDelete = () => {
    const editorEngine = useEditorEngine();
    const [deleteState, setDeleteState] = useState<DeleteState>({
        imageToDelete: null,
        isLoading: false,
    });

    const handleDeleteImage = useCallback((image: ImageContentData) => {
        setDeleteState({
            imageToDelete: image.originPath,
            isLoading: false,
        });
    }, []);

    const onDeleteImage = useCallback(async () => {
        if (deleteState.imageToDelete) {
            setDeleteState((prev) => ({ ...prev, isLoading: true }));
            try {
                await editorEngine.image.delete(deleteState.imageToDelete);
                setDeleteState({
                    imageToDelete: null,
                    isLoading: false,
                });
            } catch (error) {
                console.error('Image delete error:', error);
                setDeleteState((prev) => ({ ...prev, isLoading: false }));
            }
        }
    }, [deleteState.imageToDelete, editorEngine.image]);

    const handleDeleteModalToggle = useCallback(() => {
        setDeleteState({
            imageToDelete: null,
            isLoading: false,
        });
    }, []);

    return {
        deleteState,
        handleDeleteImage,
        onDeleteImage,
        handleDeleteModalToggle,
    };
}; 