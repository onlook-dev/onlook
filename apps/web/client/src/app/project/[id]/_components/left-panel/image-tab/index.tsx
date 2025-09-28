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

    // Simplified handlers for single active path
    const handlers = useMemo(() => ({
        handleUpload: async (files: FileList) => {
            if (!fs) return;
            // Handle file upload - would read files and write to filesystem
            console.log('Upload files:', files);
        },

        handleRefresh: () => {
            // The useDirectory hook automatically refreshes via file watching
            setError(null);
        },

        getImagesInFolder: () => {
            // Get all images from the active path (imagesPath = '/public')
            const imagesInActiveFolder = imageFiles.filter(file => {
                // For the active folder (/public), match files like /public/image.png
                return file.path.startsWith(imagesPath + '/') &&
                    file.path.indexOf('/', imagesPath.length + 1) === -1; // Direct children only
            });

            // Convert FileEntry to ImageContentData format
            return imagesInActiveFolder.map(file => ({
                originPath: file.path,
                content: '', // Content would be loaded when needed
                fileName: file.name,
                mimeType: getMimeType(file.name),
            }));
        },
    }), [fs, imageFiles, imagesPath]);

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
