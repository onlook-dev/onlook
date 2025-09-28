import { useEditorEngine } from '@/components/store/editor';
import { useDirectory, useFS, type FileEntry } from '@onlook/file-system/hooks';
import type { FolderNode } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { getMimeType, isImageFile } from '@onlook/utility/src/file';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Folder from './folder';

export const ImagesTab = observer(() => {
    const editorEngine = useEditorEngine();
    // For now, use a simple project root - in real implementation this would come from project context
    const rootDir = `/${editorEngine.projectId}/${editorEngine.branches.activeBranch.id}`;
    const imagesPath = '/public'; // Common images directory

    // File system hooks
    const { fs, isInitializing, error: fsError } = useFS(rootDir);
    const { entries: allEntries, loading: entriesLoading, error: entriesError } = useDirectory(rootDir, imagesPath);
    console.log('allEntries', allEntries);
    const [isReady, setIsReady] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Use the existing utility function
    const checkIsImageFile = useCallback((fileName: string) => {
        return isImageFile(fileName);
    }, []);

    // Filter and process entries
    const { folders, imageFiles } = useMemo(() => {
        if (!allEntries) return { folders: [], imageFiles: [] };

        const folders: FolderNode[] = [];
        const imageFiles: FileEntry[] = [];

        for (const entry of allEntries) {
            if (entry.isDirectory) {
                folders.push({
                    name: entry.name,
                    fullPath: entry.path,
                });
            } else if (checkIsImageFile(entry.name)) {
                imageFiles.push(entry);
            }
        }

        return { folders, imageFiles };
    }, [allEntries, checkIsImageFile]);

    // Real handlers using file system operations
    const handlers = useMemo(() => ({
        handleCreateFolder: async (parentPath?: string) => {
            if (!fs) return;
            // This would be implemented when folder creation UI is connected
            console.log('Create folder in:', parentPath || imagesPath);
        },

        handleRenameFolder: async (oldPath: string, newName: string) => {
            if (!fs) return;
            try {
                const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
                const newPath = `${parentPath}/${newName}`;
                await fs.moveFile(oldPath, newPath);
            } catch (error) {
                setError(`Failed to rename folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },

        handleDeleteFolder: async (folderPath: string) => {
            if (!fs) return;
            try {
                await fs.deleteDirectory(folderPath);
            } catch (error) {
                setError(`Failed to delete folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },

        handleMoveToFolder: async (sourcePath: string, targetPath: string) => {
            if (!fs) return;
            try {
                await fs.moveFile(sourcePath, targetPath);
            } catch (error) {
                setError(`Failed to move: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },

        handleRenameImage: async (oldPath: string, newName: string) => {
            if (!fs) return;
            try {
                const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
                const newPath = `${parentPath}/${newName}`;
                await fs.moveFile(oldPath, newPath);
            } catch (error) {
                setError(`Failed to rename image: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },

        handleDeleteImage: async (imagePath: string) => {
            if (!fs) return;
            try {
                await fs.deleteFile(imagePath);
            } catch (error) {
                setError(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },

        handleMoveImageToFolder: async (imagePath: string, targetFolderPath: string) => {
            if (!fs) return;
            try {
                const fileName = imagePath.substring(imagePath.lastIndexOf('/') + 1);
                const newPath = `${targetFolderPath}/${fileName}`;
                await fs.moveFile(imagePath, newPath);
            } catch (error) {
                setError(`Failed to move image: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },

        handleUpload: async (files: FileList) => {
            if (!fs) return;
            // Handle file upload - would read files and write to filesystem
            console.log('Upload files:', files);
        },

        handleRefresh: () => {
            // The useDirectory hook automatically refreshes via file watching
            // But we could force a refresh here if needed
            setError(null);
        },

        getChildFolders: (parentFolder?: FolderNode) => {
            // Return folders filtered by parent path
            if (!parentFolder || parentFolder.fullPath === imagesPath) {
                return folders;
            }
            return folders.filter(folder =>
                folder.fullPath.startsWith(parentFolder.fullPath + '/')
            );
        },

        getImagesInFolder: (folder?: FolderNode) => {
            // Return images in the specified folder converted to ImageContentData
            const folderPath = folder?.fullPath || imagesPath;
            const imagesInFolder = imageFiles.filter(file =>
                file.path.startsWith(folderPath + '/') &&
                file.path.indexOf('/', folderPath.length + 1) === -1 // Direct children only
            );

            // Convert FileEntry to ImageContentData format
            return imagesInFolder.map(file => ({
                originPath: file.path,
                content: '', // Content would be loaded when needed
                fileName: file.name,
                mimeType: getMimeType(file.name),
            }));
        },
    }), [fs, folders, imageFiles, imagesPath]);

    // Use useEffect to set loading and error states to avoid infinite re-renders
    useEffect(() => {
        setIsReady(!(isInitializing || entriesLoading));
    }, [isInitializing, entriesLoading]);

    useEffect(() => {
        if (fsError || entriesError) {
            setError(fsError?.message || entriesError?.message || null);
        } else {
            setError(null);
        }
    }, [fsError, entriesError]);

    if (!isReady) {
        return (
            <div className="w-full h-full flex items-center justify-center gap-2">
                <Icons.Reload className="w-4 h-4 animate-spin" />
                Indexing images...
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col gap-2 p-3 overflow-x-hidden">
            {error && (
                <div className="mb-2 px-3 py-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
                    {error}
                </div>
            )}
            <Folder handlers={handlers} />
        </div>
    );
});
