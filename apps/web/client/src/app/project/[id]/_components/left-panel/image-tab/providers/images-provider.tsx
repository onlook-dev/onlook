import { useEditorEngine } from '@/components/store/editor';
import { type ImageContentData } from '@onlook/models';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useImageUpload } from '../hooks/use-image-upload';
import { useImageDelete } from '../hooks/use-image-delete';
import { useImageRename } from '../hooks/use-image-rename';
import type { FolderNode } from './types';

interface ImagesContextValue {
    editorEngine: ReturnType<typeof useEditorEngine>;
    imageAssets: ImageContentData[];
    folderStructure: FolderNode;

    // Image operations
    isOperating: boolean;

    deleteOperations: ReturnType<typeof useImageDelete>;
    renameOperations: ReturnType<typeof useImageRename>;
    uploadOperations: ReturnType<typeof useImageUpload>;
}

const ImagesContext = createContext<ImagesContextValue | null>(null);

interface ImagesProviderProps {
    children: ReactNode
}

export const ImagesProvider = ({ children }: ImagesProviderProps) => {
    const editorEngine = useEditorEngine();
    const imageAssets = editorEngine.image.assets;

    

    const deleteOperations = useImageDelete();
    const renameOperations = useImageRename();
    const uploadOperations = useImageUpload();

    const folderStructure = useMemo(() => {
        const createFolderNode = (name: string, path: string, fullPath: string): FolderNode => ({
            name,
            path,
            fullPath,
            images: [],
            children: new Map(),
        });

        const root = createFolderNode('public', '', '');

        imageAssets.forEach((image) => {
            if (!image.originPath) return;

            // Extract directory path from originPath
            let pathParts = image.originPath.split('/');
            pathParts.pop(); // Remove filename

            // Remove 'public' from the beginning if it exists (NextJS project structure)
            if (pathParts[0] === 'public') {
                pathParts = pathParts.slice(1);
            }

            // If no path parts remain after removing 'public', image is in root
            if (pathParts.length === 0) {
                root.images.push(image);
                return;
            }

            let currentNode = root;
            let currentPath = '';

            pathParts.forEach((part: string) => {
                if (!part) return; // Skip empty parts

                currentPath = currentPath ? `${currentPath}/${part}` : part;

                if (!currentNode.children.has(part)) {
                    currentNode.children.set(
                        part,
                        createFolderNode(part, currentPath, currentPath),
                    );
                }

                currentNode = currentNode.children.get(part)!;
            });

            // Add image to the final folder
            currentNode.images.push(image);
        });

        return root;
    }, [imageAssets]);


    const value: ImagesContextValue = {
        editorEngine,
        imageAssets,
        folderStructure,
        // Provide default no-op functions if operations not provided
        isOperating: deleteOperations.deleteState.isLoading || renameOperations.renameState.isLoading,
        uploadOperations,

        deleteOperations,
        renameOperations,
    };

    return <ImagesContext.Provider value={value}>{children}</ImagesContext.Provider>;
};

export const useImagesContext = () => {
    const context = useContext(ImagesContext);
    if (!context) {
        throw new Error('useImagesContext must be used within ImagesProvider');
    }
    return context;
};