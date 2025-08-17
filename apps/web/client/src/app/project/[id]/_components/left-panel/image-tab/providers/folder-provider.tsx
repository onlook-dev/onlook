import { useEditorEngine } from '@/components/store/editor';
import { observer } from 'mobx-react-lite';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { FolderNode } from '@onlook/models';
import {
    validateFolderRename,
    validateFolderMove,
    validateFolderCreate,
    isImageFile
} from '@onlook/utility';

interface FolderState {
    isLoading: boolean;
    error: string | null;
}

interface RenameFolderState extends FolderState {
    folderToRename: FolderNode | null;
    newFolderName: string;
}

interface DeleteFolderState extends FolderState {
    folderToDelete: FolderNode | null;
}

interface MoveFolderState extends FolderState {
    folderToMove: FolderNode | null;
    targetFolder: FolderNode | null;
}

interface CreateFolderState extends FolderState {
    isCreating: boolean;
    newFolderName: string;
    parentFolder: FolderNode | null;
}

interface FolderContextValue {
    // Rename operations
    renameState: RenameFolderState;
    handleRenameFolder: (folder: FolderNode) => void;
    handleRenameInputChange: (value: string) => void;
    onRenameFolder: () => Promise<void>;
    handleRenameModalToggle: () => void;

    // Delete operations
    deleteState: DeleteFolderState;
    handleDeleteFolder: (folder: FolderNode) => void;
    onDeleteFolder: () => Promise<void>;
    handleDeleteModalToggle: () => void;

    // Move operations
    moveState: MoveFolderState;
    handleMoveToFolder: (folder: FolderNode, targetFolder: FolderNode) => void;
    onMoveFolder: () => Promise<void>;
    handleMoveModalToggle: () => void;

    // Create operations
    createState: CreateFolderState;
    handleCreateFolder: (parentFolder: FolderNode | null) => void;
    handleCreateFolderInputChange: (value: string) => void;
    onCreateFolder: () => Promise<boolean>;
    handleCreateModalToggle: () => void;

    // Global state
    isOperating: boolean;
    getChildFolders: (folder: FolderNode) => { name: string; fullPath: string; }[];
    getImagesInFolder: (folder: FolderNode) => string[];
}

const FolderContext = createContext<FolderContextValue | null>(null);

interface FolderProviderProps {
    children: ReactNode;
}

export const FolderProvider = observer(({ children }: FolderProviderProps) => {
    const editorEngine = useEditorEngine();

    const [renameState, setRenameState] = useState<RenameFolderState>({
        folderToRename: null,
        newFolderName: '',
        isLoading: false,
        error: null,
    });

    const [deleteState, setDeleteState] = useState<DeleteFolderState>({
        folderToDelete: null,
        isLoading: false,
        error: null,
    });

    const [moveState, setMoveState] = useState<MoveFolderState>({
        folderToMove: null,
        targetFolder: null,
        isLoading: false,
        error: null,
    });

    const [createState, setCreateState] = useState<CreateFolderState>({
        isCreating: false,
        isLoading: false,
        error: null,
        newFolderName: '',
        parentFolder: null,
    });

    const handleRenameFolder = useCallback((folder: FolderNode) => {
        setRenameState({
            folderToRename: folder,
            newFolderName: folder.name,
            isLoading: false,
            error: null,
        });
    }, []);

    const handleRenameInputChange = useCallback((value: string) => {
        setRenameState((prev) => ({
            ...prev,
            newFolderName: value,
            error: null,
        }));
    }, []);

    const onRenameFolder = useCallback(async () => {
        if (!renameState.folderToRename) return;

        const validation = validateFolderRename(
            renameState.folderToRename.fullPath,
            renameState.newFolderName,
        );

        if (!validation.isValid) {
            setRenameState((prev) => ({
                ...prev,
                error: validation.error ?? 'Invalid folder name',
            }));
            return;
        }

        if (validation.error === 'Name unchanged') {
            setRenameState({
                folderToRename: null,
                newFolderName: '',
                isLoading: false,
                error: null,
            });
            return;
        }

        setRenameState((prev) => ({ ...prev, isLoading: true }));

        try {
            const { folderToRename } = renameState;
            const oldPath = folderToRename.fullPath;
            const newPath = validation.newPath!;

            await editorEngine.sandbox.rename(oldPath, newPath);

            setRenameState({
                folderToRename: null,
                newFolderName: '',
                isLoading: false,
                error: null,
            });
        } catch (error) {
            setRenameState((prev) => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to rename folder',
                isLoading: false,
            }));
            console.error('Folder rename error:', error);
        }
    }, [renameState, editorEngine]);

    const handleDeleteFolder = useCallback((folder: FolderNode) => {
        setDeleteState({
            folderToDelete: folder,
            isLoading: false,
            error: null,
        });
    }, []);

    const onDeleteFolder = useCallback(async () => {
        if (!deleteState.folderToDelete) return;

        setDeleteState((prev) => ({ ...prev, isLoading: true }));

        try {
            const folderPath = deleteState.folderToDelete.fullPath;

            await editorEngine.sandbox.delete(folderPath, true);

            setDeleteState({
                folderToDelete: null,
                isLoading: false,
                error: null,
            });
        } catch (error) {
            setDeleteState((prev) => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to delete folder',
                isLoading: false,
            }));
            console.error('Folder delete error:', error);
        }
    }, [deleteState.folderToDelete, editorEngine]);

    const handleMoveToFolder = useCallback((folder: FolderNode, targetFolder: FolderNode) => {
        setMoveState({
            folderToMove: folder,
            targetFolder: targetFolder,
            isLoading: false,
            error: null,
        });
    }, []);

    const onMoveFolder = useCallback(async () => {
        if (!moveState.folderToMove || !moveState.targetFolder) {
            setMoveState((prev) => ({
                ...prev,
                error: 'Please select a target folder',
            }));
            return;
        }

        const validation = validateFolderMove(
            moveState.folderToMove.fullPath,
            moveState.targetFolder.fullPath,
        );

        if (!validation.isValid) {
            setMoveState((prev) => ({
                ...prev,
                error: validation.error ?? 'Invalid move operation',
            }));
            return;
        }

        setMoveState((prev) => ({ ...prev, isLoading: true }));

        try {
            const { folderToMove } = moveState;
            const oldPath = folderToMove.fullPath;
            const newPath = validation.newPath!;

            if (oldPath === newPath) {
                setMoveState((prev) => ({
                    ...prev,
                    error: 'Cannot move folder to the same path',
                    isLoading: false,
                }));
                return;
            }

            await editorEngine.sandbox.rename(oldPath, newPath);

            setMoveState({
                folderToMove: null,
                targetFolder: null,
                isLoading: false,
                error: null,
            });
        } catch (error) {
            setMoveState((prev) => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to move folder',
                isLoading: false,
            }));
            console.error('Folder move error:', error);
        }
    }, [moveState, editorEngine]);

    // Modal toggle handlers
    const handleRenameModalToggle = useCallback(() => {
        setRenameState({
            folderToRename: null,
            newFolderName: '',
            isLoading: false,
            error: null,
        });
    }, []);

    const handleDeleteModalToggle = useCallback(() => {
        setDeleteState({
            folderToDelete: null,
            isLoading: false,
            error: null,
        });
    }, []);

    const handleMoveModalToggle = useCallback(() => {
        setMoveState({
            folderToMove: null,
            targetFolder: null,
            isLoading: false,
            error: null,
        });
    }, []);

    const handleCreateFolder = useCallback((parentFolder: FolderNode | null) => {
        setCreateState({
            isCreating: true,
            isLoading: false,
            error: null,
            newFolderName: '',
            parentFolder: parentFolder ?? null,
        });
    }, []);

    const handleCreateFolderInputChange = useCallback((value: string) => {
        setCreateState((prev) => ({
            ...prev,
            newFolderName: value,
            error: null,
        }));
    }, []);

    const onCreateFolder = useCallback(async (): Promise<boolean> => {
        const validation = validateFolderCreate(
            createState.newFolderName,
            createState.parentFolder?.fullPath,
        );

        if (!validation.isValid) {
            setCreateState((prev) => ({
                ...prev,
                error: validation.error ?? 'Invalid folder name',
            }));
            return false;
        }

        setCreateState((prev) => ({ ...prev, isLoading: true }));

        try {
            const newFolderPath = validation.newPath!;

            // Create the folder with a .gitkeep file to make it visible in the sandbox
            const gitkeepPath = `${newFolderPath}/.gitkeep`.replace(/\\/g, '/');
            const gitkeepContent = '# This folder was created by Onlook\n';
            const success = await editorEngine.sandbox.writeFile(gitkeepPath, gitkeepContent);

            setCreateState({
                isCreating: false,
                isLoading: false,
                error: null,
                newFolderName: '',
                parentFolder: null,
            });

            return success;
        } catch (error) {
            setCreateState((prev) => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to create folder',
                isLoading: false,
            }));
            return false;
        }
    }, [createState, editorEngine]);

    const handleCreateModalToggle = useCallback(() => {
        setCreateState({
            isCreating: false,
            isLoading: false,
            error: null,
            newFolderName: '',
            parentFolder: null,
        });
    }, []);

    const getChildFolders = useCallback((folder: FolderNode) => {
        const childFolders = editorEngine.sandbox.directories.filter(dir => {
            if (dir.startsWith(folder.fullPath)) {
                // Check if this is a direct child (not in a subdirectory)
                const relativePath = dir.slice(folder.fullPath.length);
                // Remove leading slash if present
                const cleanRelativePath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
                // Only include if it's a direct child (no additional path separators)
                return !cleanRelativePath.includes('/') && cleanRelativePath.length > 0;
            }
            return false;
        });
        return childFolders.map(dir => ({
            name: dir.split('/').pop() ?? '',
            fullPath: dir,
        }));
    }, [editorEngine.sandbox.directories]);

    // Get all folder paths
    const getImagesInFolder = useCallback((folder: FolderNode) => {
        return editorEngine.sandbox.files.filter(image => {
            if(image.startsWith(folder.fullPath)) {
                // Check if this is a direct child (not in a subdirectory)
                const relativePath = image.slice(folder.fullPath.length);
                // Remove leading slash if present
                const cleanRelativePath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
                // Only include if it's a direct child (no additional path separators)
                if (!cleanRelativePath.includes('/')) {
                    return isImageFile(image);
                }
            }
            return false;
        });
    }, [editorEngine.sandbox.files]);

    // Check if any operation is loading
    const isOperating =
        renameState.isLoading ||
        deleteState.isLoading ||
        moveState.isLoading ||
        createState.isLoading;

    const value: FolderContextValue = {
        // Rename operations
        renameState,
        handleRenameFolder,
        handleRenameInputChange,
        onRenameFolder,
        handleRenameModalToggle,

        // Delete operations
        deleteState,
        handleDeleteFolder,
        onDeleteFolder,
        handleDeleteModalToggle,

        // Move operations
        moveState,
        handleMoveToFolder,
        onMoveFolder,
        handleMoveModalToggle,

        // Create operations
        createState,
        handleCreateFolder,
        handleCreateFolderInputChange,
        onCreateFolder,
        handleCreateModalToggle,

        // Global state
        isOperating,
        getChildFolders,
        getImagesInFolder,
    };

    return <FolderContext.Provider value={value}>{children}</FolderContext.Provider>;
});

export const useFolderContext = () => {
    const context = useContext(FolderContext);
    if (!context) {
        throw new Error('useFolderContext must be used within FolderProvider');
    }
    return context;
}; 