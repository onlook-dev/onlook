import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEditorEngine } from '@/components/store/editor';
import type { ImageContentData, FolderNode } from '@onlook/models';
import { useFolderContext } from '../providers/folder-provider';

interface FolderImagesState {
    isLoading: boolean;
    error: string | null;
    images: ImageContentData[];
}

export const useFolderImages = (folder: FolderNode) => {
    const editorEngine = useEditorEngine();
    const { getImagesInFolder } = useFolderContext();
    const allImages = useMemo(() => getImagesInFolder(folder), [getImagesInFolder, folder]);

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

    const loadFolderImages = useCallback(async (currentFolder: FolderNode | null) => {
        if (!currentFolder) {
            setFolderImagesState({
                isLoading: false,
                error: null,
                images: [],
            });
            return;
        }

        if (allImages.length > 0) {
            await readImagesContent(allImages);
        } else {
            setFolderImagesState({
                isLoading: false,
                error: null,
                images: [],
            });
        }
    }, [readImagesContent, allImages]);

    // Auto-load images when the folder or image list changes
    useEffect(() => {
        loadFolderImages(folder);
    }, [allImages, folder]);

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