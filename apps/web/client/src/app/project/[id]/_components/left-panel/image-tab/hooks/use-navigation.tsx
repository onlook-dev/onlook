import { DEFAULT_IMAGE_DIRECTORY } from '@onlook/constants';
import { useMemo, useState } from 'react';

export const useNavigation = (initialFolder = DEFAULT_IMAGE_DIRECTORY) => {
    const [activeFolder, setActiveFolder] = useState(initialFolder);
    const [search, setSearch] = useState('');

    // Generate breadcrumb path segments
    const breadcrumbSegments = useMemo(() => {
        const segments = activeFolder.split('/').filter(Boolean);
        return segments.map((segment, index) => {
            const path = '/' + segments.slice(0, index + 1).join('/');
            return { name: segment, path };
        });
    }, [activeFolder]);

    const navigateToFolder = (folderPath: string) => {
        setActiveFolder(folderPath);
        setSearch(''); // Clear search when navigating
    };

    const handleFolderClick = (folder: { name: string }) => {
        const newPath = activeFolder === '/' ? `/${folder.name}` : `${activeFolder}/${folder.name}`;
        navigateToFolder(newPath);
    };

    // Filter images based on search
    const filterImages = <T extends { name: string }>(images: T[]) => {
        if (!search) return images;
        return images.filter(image =>
            image.name.toLowerCase().includes(search.toLowerCase())
        );
    };

    return {
        activeFolder,
        search,
        setSearch,
        breadcrumbSegments,
        navigateToFolder,
        handleFolderClick,
        filterImages,
    };
};