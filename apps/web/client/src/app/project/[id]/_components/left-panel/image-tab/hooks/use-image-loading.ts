import { useMemo } from 'react';
import { useEditorEngine } from '@/components/store/editor';

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
            editorEngine.sandbox.isIndexingFiles
        );
    }, [
        uploadState.isUploading,
        deleteState.isLoading,
        renameState.isLoading,
        editorEngine.image.isScanning,
        editorEngine.sandbox.isIndexingFiles,
    ]);

    return {
        isAnyOperationLoading,
    };
}; 