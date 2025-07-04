import { useEditorEngine } from '@/components/store/editor';
import type { WebSocketSession } from '@codesandbox/sdk';
import { useCallback, useState } from 'react';
import type { FolderNode } from '../providers/types';

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
        if (!renameState.folderToRename || !renameState.newFolderName.trim()) {
            setRenameState((prev) => ({
                ...prev,
                error: 'Folder name cannot be empty',
            }));
            return;
        }

        if (renameState.newFolderName === renameState.folderToRename.name) {
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
            const { folderToRename, newFolderName } = renameState;
            const oldPath = folderToRename.fullPath;
            const parentPath = oldPath.includes('/')
                ? oldPath.substring(0, oldPath.lastIndexOf('/'))
                : '';
            const newPath = parentPath ? `${parentPath}/${newFolderName}` : newFolderName;

            await editorEngine.sandbox.rename(oldPath, newPath);

            editorEngine.image.scanImages();

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
            const folderPath = `${deleteState.folderToDelete.fullPath}`;

            for (const image of deleteState.folderToDelete.images) {
                if (image) {
                    await editorEngine.sandbox.delete(image);
                }
            }

            await editorEngine.sandbox.delete(folderPath, true);

            editorEngine.image.scanImages();

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

        // Prevent moving folder into itself or its children
        if (moveState.targetFolder.fullPath.startsWith(moveState.folderToMove.fullPath)) {
            setMoveState((prev) => ({
                ...prev,
                error: 'Cannot move folder into itself or its children',
            }));
            return;
        }

        setMoveState((prev) => ({ ...prev, isLoading: true }));

        try {
            const { folderToMove, targetFolder } = moveState;
            const oldPath = folderToMove.fullPath;
            const newPath = targetFolder.fullPath
                ? `${targetFolder.fullPath}/${folderToMove.name}`
                : folderToMove.name;

            const session = editorEngine.sandbox.session?.session;
            if (!session) {
                throw new Error('No sandbox session available');
            }
            await editorEngine.sandbox.rename(oldPath, newPath);

            // Refresh images
            editorEngine.image.scanImages();

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

    const moveFolderContents = async (folder: FolderNode, newPath: string, session: WebSocketSession) => {
        const gitkeepPath = `${newPath}/.gitkeep`.replace(/\\/g, '/');
        const gitkeepContent = '# This folder was created by Onlook\n';
        await session.fs.writeTextFile(gitkeepPath, gitkeepContent);

        for (const image of folder.images) {
            if (image) {
                const fileName = image.split('/').pop();
                const newImagePath = `${newPath}/${fileName}`;
                await editorEngine.sandbox.copy(image, newImagePath);
                await editorEngine.sandbox.delete(image);
            }
        }

        for (const [, subfolder] of folder.children) {
            await moveSubfolder(subfolder, newPath, session);
        }
    };

    const moveSubfolder = async (subfolder: FolderNode, newParentPath: string, session: WebSocketSession) => {
        const newSubfolderPath = `${newParentPath}/${subfolder.name}`;
        await moveFolderContents(subfolder, newSubfolderPath, session);
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

    const handleCreateFolder = useCallback((parentFolder?: FolderNode) => {
        setCreateState({
            isCreating: true,
            isLoading: false,
            error: null,
            newFolderName: '',
            parentFolder: parentFolder || null,
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
        if (!createState.newFolderName.trim()) {
            setCreateState((prev) => ({
                ...prev,
                error: 'Folder name cannot be empty',
            }));
            return;
        }

        setCreateState((prev) => ({ ...prev, isLoading: true }));

        try {
            const folderName = createState.newFolderName.trim();
            const parentPath = createState.parentFolder?.fullPath || '';
            const newFolderPath = parentPath ? `${parentPath}/${folderName}` : folderName;

            const session = editorEngine.sandbox.session?.session;
            if (!session) {
                throw new Error('No sandbox session available');
            }

            // Create the folder with a .gitkeep file
            const gitkeepPath = `${newFolderPath}/.gitkeep`.replace(/\\/g, '/');
            const gitkeepContent = '# This folder was created by Onlook\n';
            await session.fs.writeTextFile(gitkeepPath, gitkeepContent);

            await editorEngine.sandbox.updateFileCache(gitkeepPath, gitkeepContent);
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

    const scanFolderChildren = useCallback(async (folder: FolderNode): Promise<void> => {
        if (!editorEngine.sandbox.session.session) {
            console.warn('No session available for folder scanning');
            return;
        }

        try {

            const folderPathToScan = folder.fullPath
            const entries = await editorEngine.sandbox.session.session.fs.readdir(folderPathToScan);

            const existingChildNames = new Set(folder.children.keys());

            for (const entry of entries) {
                if (entry.type === 'directory' && !existingChildNames.has(entry.name)) {
                    // Create new folder node for empty directory
                    const childPath = folder.fullPath ? `${folder.fullPath}/${entry.name}` : entry.name;
                    const newFolderNode: FolderNode = {
                        name: entry.name,
                        path: childPath,
                        fullPath: childPath,
                        images: [],
                        children: new Map(),
                    };

                    folder.children.set(entry.name, newFolderNode);
                }
            }
        } catch (error) {
            console.error('Error scanning folder children:', error);
        }
    }, [editorEngine]);

    // Check if any operation is loading
    const isOperating = renameState.isLoading || deleteState.isLoading || moveState.isLoading || createState.isLoading;

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

        // Folder scanning
        scanFolderChildren,

        // Global state
        isOperating,
    };
};
