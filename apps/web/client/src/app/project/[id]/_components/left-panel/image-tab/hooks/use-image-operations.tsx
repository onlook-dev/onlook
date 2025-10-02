import { useDirectory } from '@onlook/file-system/hooks';
import { isImageFile } from '@onlook/utility/src/file';
import { sanitizeFilename } from '@onlook/utility';
import { useMemo, useState } from 'react';
import path from 'path';
import type { CodeEditorApi } from '@/services/code-editor-api';

export const useImageOperations = (rootDir: string, activeFolder: string, codeEditor?: CodeEditorApi) => {
    const [isUploading, setIsUploading] = useState(false);

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

    return {
        folders,
        images,
        loading,
        error,
        isUploading,
        handleUpload,
    };
};