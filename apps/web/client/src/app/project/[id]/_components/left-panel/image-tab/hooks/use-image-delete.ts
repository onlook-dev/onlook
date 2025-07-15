import { useCallback, useEffect, useState } from 'react';
import { type ImageContentData } from '@onlook/models';
import { useEditorEngine } from '@/components/store/editor';

interface DeleteState {
    imageToDelete: string | null;
    isLoading: boolean;
    error: string | null;
}

export const useImageDelete = () => {
    const editorEngine = useEditorEngine();
    const [deleteState, setDeleteState] = useState<DeleteState>({
        imageToDelete: null,
        isLoading: false,
        error: null,
    });

    const handleDeleteImage = useCallback((image: ImageContentData) => {
        setDeleteState({
            imageToDelete: image.originPath,
            isLoading: false,
            error: null,
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
                    error: null,
                });
            } catch (error) {
                console.error('Image delete error:', error);
                setDeleteState((prev) => ({ ...prev, imageToDelete: null, isLoading: false, error: 'Failed to delete image' }));
            }
        }
    }, [deleteState.imageToDelete, editorEngine.image]);

    const handleDeleteModalToggle = useCallback(() => {
        setDeleteState({
            imageToDelete: null,
            isLoading: false,
            error: null,
        });
    }, []);


    useEffect(() => {
        if (deleteState.error) {
            const timer = setTimeout(() => {
                setDeleteState((prev) => ({ ...prev, error: null }));
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [deleteState.error]);

    return {
        deleteState,
        handleDeleteImage,
        onDeleteImage,
        handleDeleteModalToggle,
    };
}; 