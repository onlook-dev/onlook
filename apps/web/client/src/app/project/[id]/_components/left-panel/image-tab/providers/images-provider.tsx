import { observer } from 'mobx-react-lite';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useImageDelete } from '../hooks/use-image-delete';
import { useImageMove } from '../hooks/use-image-move';
import { useImageRename } from '../hooks/use-image-rename';
import { useImageUpload } from '../hooks/use-image-upload';

interface ImagesContextValue {
    // Image operations
    isOperating: boolean;

    deleteOperations: ReturnType<typeof useImageDelete>;
    renameOperations: ReturnType<typeof useImageRename>;
    uploadOperations: ReturnType<typeof useImageUpload>;
    moveOperations: ReturnType<typeof useImageMove>;
    error: string | null;
}

const ImagesContext = createContext<ImagesContextValue | null>(null);

interface ImagesProviderProps {
    children: ReactNode;
}

export const ImagesProvider = observer(({ children }: ImagesProviderProps) => {
    const deleteOperations = useImageDelete();
    const renameOperations = useImageRename();
    const uploadOperations = useImageUpload();
    const moveOperations = useImageMove();

    const isOperating =
        deleteOperations.deleteState.isLoading ||
        renameOperations.renameState.isLoading ||
        uploadOperations.uploadState.isUploading ||
        moveOperations.moveState.isLoading;

    const error = useMemo(() => {
        return (
            deleteOperations.deleteState.error ??
            renameOperations.renameState.error ??
            uploadOperations.uploadState.error ??
            moveOperations.moveState.error
        );
    }, [deleteOperations.deleteState.error, renameOperations.renameState.error, uploadOperations.uploadState.error, moveOperations.moveState.error]);

    const value: ImagesContextValue = {
        isOperating,
        deleteOperations,
        renameOperations,
        uploadOperations,
        moveOperations,
        error
    };

    return <ImagesContext.Provider value={value}>{children}</ImagesContext.Provider>;
});

export const useImagesContext = () => {
    const context = useContext(ImagesContext);
    if (!context) {
        throw new Error('useImagesContext must be used within ImagesProvider');
    }
    return context;
};
