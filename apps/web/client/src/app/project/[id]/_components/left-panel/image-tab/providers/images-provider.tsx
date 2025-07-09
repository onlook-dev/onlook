import { useEditorEngine } from '@/components/store/editor';
import { DefaultSettings } from '@onlook/constants';
import { observer } from 'mobx-react-lite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFolder } from '../hooks/use-folder';
import { useImageDelete } from '../hooks/use-image-delete';
import { useImageMove } from '../hooks/use-image-move';
import { useImageRename } from '../hooks/use-image-rename';
import { useImageUpload } from '../hooks/use-image-upload';
import type { FolderNode } from './types';

interface ImagesContextValue {
    folderStructure: FolderNode;

    // Image operations
    isOperating: boolean;

    deleteOperations: ReturnType<typeof useImageDelete>;
    renameOperations: ReturnType<typeof useImageRename>;
    uploadOperations: ReturnType<typeof useImageUpload>;
    moveOperations: ReturnType<typeof useImageMove>;
    folderOperations: ReturnType<typeof useFolder>;
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
    const folderOperations = useFolder();

    // Create initial folder structure from image assets
    const baseFolderStructure = useMemo(() => {
        const createFolderNode = (name: string, path: string, fullPath: string): FolderNode => ({
            name,
            path,
            fullPath,
            images: [],
            children: new Map(),
        });

        const root = createFolderNode(DefaultSettings.IMAGE_FOLDER, '', '');

        editorEngine.image.imagePaths.forEach((image) => {
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
    }, [editorEngine.image.imagePaths]);

    const [folderStructure, setFolderStructure] = useState<FolderNode>(baseFolderStructure);

    useEffect(() => {
        setFolderStructure(baseFolderStructure);
    }, [baseFolderStructure]);

    const triggerFolderStructureUpdate = useCallback(() => {
        setFolderStructure(prev => ({ ...prev }));
    }, []);

    const isOperating =
        deleteOperations.deleteState.isLoading ||
        renameOperations.renameState.isLoading ||
        uploadOperations.uploadState.isUploading ||
        moveOperations.moveState.isLoading ||
        folderOperations.isOperating;

    const value: ImagesContextValue = {
        folderStructure: folderStructure.children.get(DefaultSettings.IMAGE_FOLDER)!,
        isOperating,
        deleteOperations,
        renameOperations,
        uploadOperations,
        moveOperations,
        folderOperations: {
            ...folderOperations,
            scanFolderChildren: useCallback(async (folder: FolderNode) => {
                await folderOperations.scanFolderChildren(folder);
                triggerFolderStructureUpdate();
            }, [folderOperations.scanFolderChildren, triggerFolderStructureUpdate]),
        },
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