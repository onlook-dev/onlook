'use client';

import { api } from '@/trpc/react';
import { useState } from 'react';

export const useRepositoryValidation = () => {
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validateRepo = api.github.validate.useMutation();

    const validateRepository = async (owner: string, repo: string) => {
        setIsValidating(true);
        setError(null);

        try {
            const result = await validateRepo.mutateAsync({ owner, repo });
            return result;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Failed to validate repository';
            setError(errorMessage);
            console.error('Error validating repository:', error);
            return null;
        } finally {
            setIsValidating(false);
        }
    };

    const clearError = () => {
        setError(null);
    };

    return {
        isValidating,
        error,
        validateRepository,
        clearError,
    };
};