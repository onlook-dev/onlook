import { useEditorEngine } from '@/components/store/editor';
import { observer } from 'mobx-react-lite';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFolder } from '../hooks/use-folder';
import { useImageDelete } from '../hooks/use-image-delete';
import { useImageMove } from '../hooks/use-image-move';
import { useImageRename } from '../hooks/use-image-rename';
import { useImageUpload } from '../hooks/use-image-upload';
import type { FolderNode } from '@onlook/models';

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

    const imagePaths = editorEngine.image.imagePaths;

    // Create initial folder structure from image assets
    const baseFolderStructure = useMemo(() => folderOperations.createBaseFolder(imagePaths), [imagePaths]);

    const [folderStructure, setFolderStructure] = useState<FolderNode>(baseFolderStructure);

    useEffect(() => {
        setFolderStructure(baseFolderStructure);
    }, [baseFolderStructure]);

    const isOperating =
        deleteOperations.deleteState.isLoading ||
        renameOperations.renameState.isLoading ||
        uploadOperations.uploadState.isUploading ||
        moveOperations.moveState.isLoading ||
        folderOperations.isOperating;

    const value: ImagesContextValue = {
        folderStructure,
        isOperating,
        deleteOperations,
        renameOperations,
        uploadOperations,
        moveOperations,
        folderOperations
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