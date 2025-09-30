'use client';

import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { BreadcrumbNavigation } from './breadcrumb-navigation';
import { FolderList } from './folder-list';
import { useImageOperations } from './hooks/use-image-operations';
import { useNavigation } from './hooks/use-navigation';
import { ImageGrid } from './image-grid';
import { SearchUploadBar } from './search-upload-bar';

export const ImagesTab = observer(() => {
    const editorEngine = useEditorEngine();
    const rootDir = `/${editorEngine.projectId}/${editorEngine.branches.activeBranch.id}`;

    // Navigation state and handlers
    const {
        activeFolder,
        search,
        setSearch,
        breadcrumbSegments,
        navigateToFolder,
        handleFolderClick,
        filterImages,
    } = useNavigation('/public');

    // Image operations and data
    const {
        folders,
        images: allImages,
        loading,
        error,
        isUploading,
        handleUpload,
    } = useImageOperations(rootDir, activeFolder);

    // Filter images based on search
    const images = filterImages(allImages);

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center gap-2">
                <Icons.LoadingSpinner className="w-4 h-4 animate-spin" />
                Loading images...
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center text-sm text-red-500">
                Error: {error.message}
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col gap-3 p-3">
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

            <FolderList
                folders={folders}
                onFolderClick={handleFolderClick}
            />

            <ImageGrid
                images={images}
                rootDir={rootDir}
                search={search}
            />
        </div>
    );
});