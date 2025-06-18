import type { PageMetadata } from '@onlook/models';
import { useEffect, useState } from 'react';
interface UseMetadataFormProps {
    initialMetadata?: PageMetadata;
    defaultTitle?: string;
    defaultDescription?: string;
}

export const useMetadataForm = ({
    initialMetadata,
    defaultTitle = 'Title',
    defaultDescription = 'This is the information that will show up on search engines below your page title.',
}: UseMetadataFormProps) => {
    const [title, setTitle] = useState(initialMetadata?.title ?? defaultTitle);
    const [description, setDescription] = useState(
        initialMetadata?.description ?? defaultDescription,
    );
    const [isDirty, setIsDirty] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        setIsDirty(true);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(e.target.value);
        setIsDirty(true);
    };

    const handleImageSelect = (file: File) => {
        setUploadedImage(file);
        setIsDirty(true);
    };

    const handleDiscard = () => {
        setTitle(initialMetadata?.title ?? defaultTitle);
        setDescription(initialMetadata?.description ?? defaultDescription);
        setUploadedImage(null);
        setIsDirty(false);
    };

    useEffect(() => {
        setTitle(initialMetadata?.title ?? defaultTitle);
        setDescription(initialMetadata?.description ?? defaultDescription);
    }, [initialMetadata, defaultTitle, defaultDescription]);

    return {
        title,
        description,
        isDirty,
        uploadedImage,
        handleTitleChange,
        handleDescriptionChange,
        handleImageSelect,
        handleDiscard,
        setTitle,
        setDescription,
        setIsDirty,
    };
};