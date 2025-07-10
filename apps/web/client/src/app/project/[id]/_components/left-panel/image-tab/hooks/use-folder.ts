import { useEditorEngine } from '@/components/store/editor';
import { useCallback, useState } from 'react';
import type { FolderNode } from '@onlook/models';
import {
    createBaseFolder,
    validateFolderRename,
    validateFolderMove,
    validateFolderCreate,
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

export const useFolder = () => {
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

            void editorEngine.image.scanImages();

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

            await editorEngine.image.scanImages();

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

            const session = editorEngine.sandbox.session?.session;
            if (!session) {
                throw new Error('No sandbox session available');
            }
            await editorEngine.sandbox.rename(oldPath, newPath);

            // Refresh images
            void editorEngine.image.scanImages();

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

    const moveFolderContents = async (folder: FolderNode, newPath: string) => {
        const gitkeepPath = `${newPath}/.gitkeep`.replace(/\\/g, '/');
        const gitkeepContent = '# This folder was created by Onlook\n';
        await editorEngine.sandbox.writeFile(gitkeepPath, gitkeepContent);

        for (const image of folder.images) {
            if (image) {
                const fileName = image.split('/').pop() ?? '';
                const newImagePath = `${newPath}/${fileName}`;
                await editorEngine.sandbox.copy(image, newImagePath);
                await editorEngine.sandbox.delete(image);
            }
        }

        if (folder.children) {
            for (const [, subfolder] of folder.children) {
                await moveSubfolder(subfolder, newPath);
            }
        }
    };

    const moveSubfolder = async (subfolder: FolderNode, newParentPath: string) => {
        const newSubfolderPath = `${newParentPath}/${subfolder.name}`;
        await moveFolderContents(subfolder, newSubfolderPath);
    };

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

    const onCreateFolder = useCallback(async () => {
        const validation = validateFolderCreate(
            createState.newFolderName,
            createState.parentFolder?.fullPath,
        );

        if (!validation.isValid) {
            setCreateState((prev) => ({
                ...prev,
                error: validation.error ?? 'Invalid folder name',
            }));
            return;
        }

        setCreateState((prev) => ({ ...prev, isLoading: true }));

        try {
            const newFolderPath = validation.newPath!;

            const session = editorEngine.sandbox.session?.session;
            if (!session) {
                throw new Error('No sandbox session available');
            }

            // Create the folder with a .gitkeep file to make it visible in the sandbox
            const gitkeepPath = `${newFolderPath}/.gitkeep`.replace(/\\/g, '/');
            const gitkeepContent = '# This folder was created by Onlook\n';
            await editorEngine.sandbox.writeFile(gitkeepPath, gitkeepContent);
            if (createState.parentFolder) {
                await scanFolderChildren(createState.parentFolder);
            }

            setCreateState({
                isCreating: false,
                isLoading: false,
                error: null,
                newFolderName: '',
                parentFolder: null,
            });
        } catch (error) {
            setCreateState((prev) => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to create folder',
                isLoading: false,
            }));
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

    const scanFolderChildren = useCallback(
        async (folder: FolderNode): Promise<void> => {
            if (!editorEngine.sandbox.session?.session) {
                console.warn('No session available for folder scanning');
                return;
            }
            try {
                const folderPathToScan = folder.fullPath;
                const entries = await editorEngine.sandbox.readDir(folderPathToScan);

                if (folder.children) {
                    const existingChildNames = new Set(folder.children.keys());

                    for (const entry of entries) {
                        if (entry.type === 'directory' && !existingChildNames.has(entry.name)) {
                            // Create new folder node for empty directory
                            const childPath = folder.fullPath
                                ? `${folder.fullPath}/${entry.name}`
                                : entry.name;
                            const newFolderNode: FolderNode = {
                                name: entry.name,
                                fullPath: childPath,
                                images: [],
                                children: new Map(),
                            };

                            folder.children.set(entry.name, newFolderNode);
                        }
                    }
                }
            } catch (error) {
                console.error('Error scanning folder children:', error);
            }
        },
        [editorEngine],
    );

    // Check if any operation is loading
    const isOperating =
        renameState.isLoading ||
        deleteState.isLoading ||
        moveState.isLoading ||
        createState.isLoading;

    return {
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
        createBaseFolder,

        // Folder scanning
        scanFolderChildren,

        // Global state
        isOperating,
    };
};
