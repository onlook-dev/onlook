import { useCallback, useEffect, useState } from 'react';
import { useEditorEngine } from '@/components/store/editor';
import type { ImageContentData } from '@onlook/models';
import type { FolderNode } from '../providers/types';

interface FolderImagesState {
    isLoading: boolean;
    error: string | null;
    images: ImageContentData[];
}

export const useFolderImages = () => {
    const editorEngine = useEditorEngine();
    const [folderImagesState, setFolderImagesState] = useState<FolderImagesState>({
        isLoading: false,
        error: null,
        images: [],
    });

    const readImageContent = useCallback(async (imagePath: string): Promise<ImageContentData | null> => {
        return editorEngine.image.readImageContent(imagePath);
    }, [editorEngine.image]);

    const readImagesContent = useCallback(async (imagePaths: string[]): Promise<ImageContentData[]> => {
        if (!imagePaths.length) {
            return [];
        }

        setFolderImagesState(prev => ({
            ...prev,
            isLoading: true,
            error: null,
        }));

        try {
            const validImages = await editorEngine.image.readImagesContent(imagePaths);

            setFolderImagesState(prev => ({
                ...prev,
                isLoading: false,
                images: validImages,
            }));

            return validImages;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to read images content';
            console.error('Error reading images content:', error);
            
            setFolderImagesState(prev => ({
                ...prev,
                isLoading: false,
                error: errorMessage,
            }));

            return [];
        }
    }, [editorEngine.image]);

    const loadFolderImages = useCallback(async (folder: FolderNode | null) => {
        if (!folder) {
            setFolderImagesState({
                isLoading: false,
                error: null,
                images: [],
            });
            return;
        }

        const allImagePaths = folder.images.filter(Boolean);

        if (allImagePaths.length > 0) {
            await readImagesContent(allImagePaths);
        } else {
            setFolderImagesState({
                isLoading: false,
                error: null,
                images: [],
            });
        }
    }, [readImagesContent]);

    useEffect(() => {
        return () => {
            setFolderImagesState({
                isLoading: false,
                error: null,
                images: [],
            });
        };
    }, []);

    return {
        folderImagesState,
        readImageContent,
        readImagesContent,
        loadFolderImages,
    };
}; 