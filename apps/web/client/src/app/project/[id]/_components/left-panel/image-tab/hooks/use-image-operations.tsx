import { useDirectory, useFS } from '@onlook/file-system/hooks';
import { isImageFile } from '@onlook/utility/src/file';
import { useMemo, useState } from 'react';
import path from 'path';

export const useImageOperations = (rootDir: string, activeFolder: string) => {
    const [isUploading, setIsUploading] = useState(false);
    const { fs } = useFS(rootDir);

    // Get directory entries
    const { entries: rootEntries, loading, error } = useDirectory(rootDir, activeFolder);
    const { entries: activeFolderEntries } = useDirectory(rootDir, activeFolder);

    // Get available folders
    const folders = useMemo(() => {
        if (!rootEntries) return [];
        return rootEntries.filter(entry => entry.isDirectory);
    }, [rootEntries]);

    // Get images in the active folder
    const images = useMemo(() => {
        if (!activeFolderEntries) return [];
        return activeFolderEntries.filter(entry => !entry.isDirectory && isImageFile(entry.name));
    }, [activeFolderEntries]);

    // Handle file upload
    const handleUpload = async (files: FileList) => {
        if (!fs || !files.length) return;
        
        setIsUploading(true);
        try {
            for (const file of Array.from(files)) {
                // Check if it's an image file
                if (!isImageFile(file.name)) {
                    console.warn(`Skipping non-image file: ${file.name}`);
                    continue;
                }
                
                // Read file content
                const arrayBuffer = await file.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                
                // Create file path in active folder
                const filePath = path.join(activeFolder, file.name);
                
                // Write file to filesystem
                await fs.writeFile(filePath, uint8Array);
            }
        } catch (error) {
            console.error('Failed to upload files:', error);
            throw error; // Re-throw for error handling in component
        } finally {
            setIsUploading(false);
        }
    };

    return {
        folders,
        images,
        loading,
        error,
        isUploading,
        handleUpload,
    };
};