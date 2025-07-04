import { useCallback, useMemo, useState } from 'react';
import { type ImageContentData } from '@onlook/models';

export const useImageSearch = ({
    imageAssets,
}: {
    imageAssets: ImageContentData[];
}) => {
    const [search, setSearch] = useState('');

    const filteredImages = useMemo(() => {
        if (!search.trim()) {
            return imageAssets;
        }
        const searchLower = search.toLowerCase();
        return imageAssets.filter((image) => image.fileName?.toLowerCase()?.includes(searchLower));
    }, [search, imageAssets]);

    const handleSearchClear = useCallback(() => {
        setSearch('');
    }, []);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setSearch('');
        }
    }, []);

    return {
        search,
        setSearch,
        filteredImages,
        handleSearchClear,
        handleSearchChange,
        handleKeyDown,
    };
}; 