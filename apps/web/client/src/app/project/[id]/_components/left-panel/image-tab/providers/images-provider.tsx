import { useEditorEngine } from '@/components/store/editor';
import { observer } from 'mobx-react-lite';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFolder } from '../hooks/use-folder';
import { useImageDelete } from '../hooks/use-image-delete';
import { useImageMove } from '../hooks/use-image-move';
import { useImageRename } from '../hooks/use-image-rename';
import { useImageUpload } from '../hooks/use-image-upload';
import type { FolderNode } from '@onlook/models';
import { isEqual } from 'lodash';
import {
    createBaseFolder,
    findFolderInStructureByPath,
    replaceFolderInStructure,
} from '@onlook/utility';
import { DefaultSettings } from '@onlook/constants';

interface ImagesContextValue {
    rootFolderStructure: FolderNode;
    updateFolderStructure: (folderStructure: FolderNode) => void;

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
    children: ReactNode;
}

export const ImagesProvider = observer(({ children }: ImagesProviderProps) => {
    const editorEngine = useEditorEngine();
    const deleteOperations = useImageDelete();
    const renameOperations = useImageRename();
    const uploadOperations = useImageUpload();
    const moveOperations = useImageMove();

    const folderPaths = editorEngine.sandbox.files.filter(file => file.startsWith(DefaultSettings.IMAGE_FOLDER));

    // Create initial folder structure from image assets
    const baseFolderStructure = useMemo(() => createBaseFolder(folderPaths), [folderPaths]);

    const [rootFolderStructure, setRootFolderStructure] = useState<FolderNode>(baseFolderStructure);

    // Initialize folder operations with the update callback
    const folderOperations = useFolder({
        onFolderStructureUpdate: (folder: FolderNode) => {
            handleFolderStructureUpdate(folder);
        },
        rootFolderStructure: rootFolderStructure,
    });

    const handleFolderStructureUpdate = (folder: FolderNode) => {
        const existingFolder = findFolderInStructureByPath(rootFolderStructure, folder.fullPath);
        if (existingFolder) {
            const newStructure = replaceFolderInStructure(rootFolderStructure, folder.fullPath, folder);
            if (newStructure !== null) {
                setRootFolderStructure(newStructure);
            }
        }
    };

    useEffect(() => {
        const updateFolderStructure = async () => {
            try {
                if(!isEqual(baseFolderStructure, rootFolderStructure)) {
                    setRootFolderStructure(baseFolderStructure);
                }
            } catch (error) {
                console.error('Error updating folder structure:', error);
            }
        };
        updateFolderStructure();
    }, [baseFolderStructure]);

    const isOperating =
        deleteOperations.deleteState.isLoading ||
        renameOperations.renameState.isLoading ||
        uploadOperations.uploadState.isUploading ||
        moveOperations.moveState.isLoading ||
        folderOperations.isOperating;

    const value: ImagesContextValue = {
        rootFolderStructure,
        updateFolderStructure: setRootFolderStructure,
        isOperating,
        deleteOperations,
        renameOperations,
        uploadOperations,
        moveOperations,
        folderOperations,
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
