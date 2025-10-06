import type { CodeFileSystem } from '@onlook/file-system';
import { useDirectory } from '@onlook/file-system/hooks';
import { sanitizeFilename } from '@onlook/utility';
import { isImageFile } from '@onlook/utility/src/file';
import path from 'path';
import { useMemo, useState } from 'react';

export const useImageOperations = (projectId: string, branchId: string, activeFolder: string, codeEditor?: CodeFileSystem) => {
    const [isUploading, setIsUploading] = useState(false);

    // Get directory entries
    const { entries: rootEntries, loading, error } = useDirectory(projectId, branchId, activeFolder);
    const { entries: activeFolderEntries } = useDirectory(projectId, branchId, activeFolder);

    // Get available folders
    const folders = useMemo(() => {
        if (!rootEntries) return [];
        return rootEntries.filter(entry => entry.isDirectory);
    }, [rootEntries]);

    // Get images in the active folder
    const images = useMemo(() => {
        if (!activeFolderEntries) return [];
        const imageEntries = activeFolderEntries.filter(entry => !entry.isDirectory && isImageFile(entry.name));

        return imageEntries;
    }, [activeFolderEntries]);

    // Handle file upload
    const handleUpload = async (files: FileList) => {
        if (!codeEditor || !files.length) return;

        setIsUploading(true);
        try {
            for (const file of Array.from(files)) {
                const sanitizedName = sanitizeFilename(file.name);

                // Check if it's an image file (using original name for validation)
                if (!isImageFile(file.name)) {
                    console.warn(`Skipping non-image file: ${file.name}`);
                    continue;
                }

                // Read file content
                const arrayBuffer = await file.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);

                const filePath = path.join(activeFolder, sanitizedName);
                await codeEditor.writeFile(filePath, uint8Array);
            }
        } catch (error) {
            console.error('Failed to upload files:', error);
            throw error; // Re-throw for error handling in component
        } finally {
            setIsUploading(false);
        }
    };

    // Handle file rename
    const handleRename = async (oldPath: string, newName: string) => {
        if (!codeEditor) throw new Error('Code editor not available');

        const directory = path.dirname(oldPath);
        const sanitizedName = sanitizeFilename(newName);
        const newPath = path.join(directory, sanitizedName);
        await codeEditor.moveFile(oldPath, newPath);
    };

    // Handle file delete
    const handleDelete = async (filePath: string) => {
        if (!codeEditor) throw new Error('Code editor not available');
        await codeEditor.deleteFile(filePath);
    };

    return {
        folders,
        images,
        loading,
        error,
        isUploading,
        handleUpload,
        handleRename,
        handleDelete,
    };
};