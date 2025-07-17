import { useEditorEngine } from '@/components/store/editor';
import { useMemo } from 'react';

interface OperationStates {
    uploadState: { isUploading: boolean };
    deleteState: { isLoading: boolean };
    renameState: { isLoading: boolean };
}

export const useImageLoading = ({ uploadState, deleteState, renameState }: OperationStates) => {
    const editorEngine = useEditorEngine();

    const isAnyOperationLoading = useMemo(() => {
        return (
            uploadState.isUploading ||
            deleteState.isLoading ||
            renameState.isLoading ||
            editorEngine.image.isScanning ||
            editorEngine.sandbox.isIndexing
        );
    }, [
        uploadState.isUploading,
        deleteState.isLoading,
        renameState.isLoading,
        editorEngine.image.isScanning,
        editorEngine.sandbox.isIndexing,
    ]);

    return {
        isAnyOperationLoading,
    };
}; 