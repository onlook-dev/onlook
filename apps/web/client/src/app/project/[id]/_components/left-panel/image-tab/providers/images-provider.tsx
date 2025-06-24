import { useEditorEngine } from '@/components/store/editor';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { useImageUpload } from '../hooks/use-image-upload';
import { useImageDelete } from '../hooks/use-image-delete';
import { useImageRename } from '../hooks/use-image-rename';
import { useImageMove } from '../hooks/use-image-move';
import type { FolderNode } from './types';

interface ImagesContextValue {
    folderStructure: FolderNode;

    // Image operations
    isOperating: boolean;

    deleteOperations: ReturnType<typeof useImageDelete>;
    renameOperations: ReturnType<typeof useImageRename>;
    uploadOperations: ReturnType<typeof useImageUpload>;
    moveOperations: ReturnType<typeof useImageMove>;
}

const ImagesContext = createContext<ImagesContextValue | null>(null);

interface ImagesProviderProps {
    children: ReactNode
}

export const ImagesProvider = observer(({ children }: ImagesProviderProps) => {
    const editorEngine = useEditorEngine();
    

    const deleteOperations = useImageDelete();
    const renameOperations = useImageRename();
    const uploadOperations = useImageUpload();
    const moveOperations = useImageMove();
    

    const folderStructure = useMemo(() => {
        const createFolderNode = (name: string, path: string, fullPath: string): FolderNode => ({
            name,
            path,
            fullPath,
            images: [],
            children: new Map(),
        });

        const root = createFolderNode('public', '', '');

        editorEngine.image.assets.forEach((image) => {
            if (!image) return;

            let pathParts = image.split('/');
            pathParts.pop();

            if (pathParts.length === 0) {
                root.images.push(image);
                return;
            }

            let currentNode = root;
            let currentPath = '';

            pathParts.forEach((part: string) => {
                if (!part) return;

                currentPath = currentPath ? `${currentPath}/${part}` : part;

                if (!currentNode.children.has(part)) {
                    currentNode.children.set(
                        part,
                        createFolderNode(part, currentPath, currentPath),
                    );
                }

                currentNode = currentNode.children.get(part)!;
            });

            currentNode.images.push(image);
        });

        return root;
    }, [editorEngine.image.assets]);

    const isOperating = 
        deleteOperations.deleteState.isLoading ||
        renameOperations.renameState.isLoading ||
        uploadOperations.uploadState.isUploading ||
        moveOperations.moveState.isLoading;

    const value: ImagesContextValue = {
        folderStructure: folderStructure.children.get('public')!,
        isOperating,
        deleteOperations,
        renameOperations,
        uploadOperations,
        moveOperations,
    };

    return <ImagesContext.Provider value={value}>{children}</ImagesContext.Provider>;
});

export const useImagesContext = () => {
    const context = useContext(ImagesContext);
    if (!context) {
        throw new Error('useImagesContext must be used within ImagesProvider');
    }
    return context;
};