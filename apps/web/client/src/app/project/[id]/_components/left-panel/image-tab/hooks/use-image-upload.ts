import { useEditorEngine } from '@/components/store/editor';
import { useCallback, useEffect, useState } from 'react';
import type { UploadState } from '../providers/types';

export const useImageUpload = () => {
    const editorEngine = useEditorEngine();

    const [uploadState, setUploadState] = useState<UploadState>({
        isUploading: false,
        error: null,
    });

    const uploadImage = useCallback(
        async (file: File, destinationFolder: string) => {
            setUploadState({ isUploading: true, error: null });

            if (!file.type.startsWith('image/')) {
                setUploadState({ isUploading: false, error: 'Please select a valid image file' });
                return;
            }
            try {                
                await editorEngine.image.upload(file, destinationFolder);
                setUploadState({ isUploading: false, error: null });
            } catch (error) {
                setUploadState({
                    isUploading: false,
                    error: 'Failed to upload image. Please try again.',
                });
                console.error('Image upload error:', error);
            }
        },
        [editorEngine.image],
    );

    const handleUploadFile = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>, destinationFolder: string) => {
            const files = Array.from(e.target.files ?? []);
            const imageFiles = files.filter((file) => file.type.startsWith('image/'));

            for (const imageFile of imageFiles) {
                await uploadImage(imageFile, destinationFolder);
            }
        },
        [uploadImage],
    );

    const handleClickAddButton = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.blur(); // Removes focus from the button to prevent tooltip from showing
        const input = document.getElementById('images-upload');
        if (input) {
            input.click();
        }
    }, []);

    useEffect(() => {
        if (uploadState.error) {
            const timer = setTimeout(() => {
                setUploadState((prev) => ({ ...prev, error: null }));
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [uploadState.error]);

    return {
        uploadState,
        uploadImage,
        handleUploadFile,
        handleClickAddButton,
    };
};
