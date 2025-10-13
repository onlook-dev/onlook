'use client';

import { useState, useCallback } from 'react';

export type ProjectLoadingType = 
    | 'creating-blank-project'
    | 'switching-project'
    | 'closing-project'
    | 'downloading-code'
    | null;

export const useProjectLoading = () => {
    const [loadingType, setLoadingType] = useState<ProjectLoadingType>(null);

    const setLoading = useCallback((type: ProjectLoadingType) => {
        setLoadingType(type);
    }, []);

    const clearLoading = useCallback(() => {
        setLoadingType(null);
    }, []);

    const isLoading = loadingType !== null;

    return {
        loadingType,
        isLoading,
        setLoading,
        clearLoading,
    };
};
