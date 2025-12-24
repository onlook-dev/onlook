import type { EditorEngine } from '@/components/store/editor/engine';
import type { CodeFileSystem } from '@onlook/file-system';
import { useDirectory } from '@onlook/file-system/hooks';
import { sanitizeFilename } from '@onlook/utility';
import { isImageFile } from '@onlook/utility/src/file';
import path from 'path';
import { useMemo, useState } from 'react';
import { updateImageReferences } from '../utils/image-references';

export const useImageOperations = (projectId: string, branchId: string, activeFolder: string, codeEditor?: CodeFileSystem, editorEngine?: EditorEngine) => {
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

        // Find all JS/TS files in the project
        const allFiles = await codeEditor.listFiles('**/*');
        const jsFiles = allFiles.filter(f => {
            const ext = path.extname(f);
            // Only process JS/TS/JSX/TSX files, skip test files and build dirs
            return ['.js', '.jsx', '.ts', '.tsx'].includes(ext) &&
                   !f.includes('node_modules') &&
                   !f.includes('.next') &&
                   !f.includes('dist') &&
                   !f.endsWith('.test.ts') &&
                   !f.endsWith('.test.tsx');
        });

        // Update references in parallel
        const updatePromises: Promise<void>[] = [];
        const oldFileName = path.basename(oldPath);

        for (const file of jsFiles) {
            const filePath = path.join('/', file);
            updatePromises.push(
                (async () => {
                    try {
                        const content = await codeEditor.readFile(filePath);
                        if (typeof content !== 'string' || !content.includes(oldFileName)) {
                            return;
                        }

                        const updatedContent = await updateImageReferences(content, oldPath, newPath);
                        if (updatedContent !== content) {
                            await codeEditor.writeFile(filePath, updatedContent);
                        }
                    } catch (error) {
                        console.warn(`Failed to update references in ${filePath}:`, error);
                    }
                })()
            );
        }

        // Wait for all updates to complete
        await Promise.all(updatePromises);

        // Finally, rename the actual image file
        await codeEditor.moveFile(oldPath, newPath);

        // Refresh all frame views after a slight delay to show updated image references
        setTimeout(() => {
            editorEngine?.frames.reloadAllViews();
        }, 500);
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