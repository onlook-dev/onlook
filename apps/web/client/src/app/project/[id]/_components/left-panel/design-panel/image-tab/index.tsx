'use client';

import { observer } from 'mobx-react-lite';

import type { ImageMessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { convertToBase64DataUrl, getMimeType } from '@onlook/utility';

import { useEditorEngine } from '@/components/store/editor';
import { BreadcrumbNavigation } from './breadcrumb-navigation';
import { FolderList } from './folder-list';
import { useImageOperations } from './hooks/use-image-operations';
import { useNavigation } from './hooks/use-navigation';
import { ImageGrid } from './image-grid';
import { SearchUploadBar } from './search-upload-bar';

export const ImagesTab = observer(() => {
    const editorEngine = useEditorEngine();
    const projectId = editorEngine.projectId;
    const branchId = editorEngine.branches.activeBranch.id;

    // Navigation state and handlers
    const {
        activeFolder,
        search,
        setSearch,
        breadcrumbSegments,
        navigateToFolder,
        handleFolderClick,
        filterImages,
    } = useNavigation();

    // Get the CodeEditorApi for the active branch
    const branchData = editorEngine.branches.getBranchDataById(
        editorEngine.branches.activeBranch.id,
    );

    // Image operations and data
    const {
        folders,
        images: allImages,
        loading,
        error,
        isUploading,
        handleUpload,
        handleRename,
        handleDelete,
    } = useImageOperations(projectId, branchId, activeFolder, branchData?.codeEditor, editorEngine);

    // Filter images based on search
    const images = filterImages(allImages);

    // Handler functions with error handling and feedback
    const handleRenameWithFeedback = async (oldPath: string, newName: string) => {
        try {
            await handleRename(oldPath, newName);
            toast.success('Image renamed successfully');
        } catch (error) {
            console.error('Failed to rename image:', error);
            toast.error(
                `Failed to rename image: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw error;
        }
    };

    const handleDeleteWithFeedback = async (filePath: string) => {
        try {
            await handleDelete(filePath);
            toast.success('Image deleted successfully');
        } catch (error) {
            console.error('Failed to delete image:', error);
            toast.error(
                `Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            throw error;
        }
    };

    const handleAddToChat = async (imagePath: string) => {
        try {
            const fileName = imagePath.split('/').pop() || imagePath;
            const mimeType = getMimeType(fileName);

            // Load the actual image file content
            const fileContent = await branchData?.codeEditor.readFile(imagePath);
            if (!fileContent) {
                throw new Error('Failed to load image file');
            }

            const base64Content = convertToBase64DataUrl(fileContent, mimeType);

            const imageContext: ImageMessageContext = {
                type: MessageContextType.IMAGE,
                source: 'local',
                path: imagePath,
                branchId: branchId,
                content: base64Content,
                displayName: fileName,
                mimeType: mimeType,
            };

            editorEngine.chat.context.addContexts([imageContext]);
            toast.success('Image added to chat');
        } catch (error) {
            console.error('Failed to add image to chat:', error);
            toast.error('Failed to add image to chat');
        }
    };

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center gap-2">
                <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                Loading images...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full w-full items-center justify-center text-sm text-red-500">
                Error: {error.message}
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col gap-3 p-3">
            <SearchUploadBar
                search={search}
                setSearch={setSearch}
                isUploading={isUploading}
                onUpload={handleUpload}
            />

            <BreadcrumbNavigation
                breadcrumbSegments={breadcrumbSegments}
                onNavigate={navigateToFolder}
            />

            <FolderList folders={folders} onFolderClick={handleFolderClick} />

            <ImageGrid
                images={images}
                projectId={projectId}
                branchId={branchId}
                search={search}
                onUpload={handleUpload}
                onRename={handleRenameWithFeedback}
                onDelete={handleDeleteWithFeedback}
                onAddToChat={handleAddToChat}
            />
        </div>
    );
});
