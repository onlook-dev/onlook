import type { PageMetadata, TitleMetadata } from '@onlook/models';
import { useEffect, useState, useMemo } from 'react';

interface UseMetadataFormProps {
    initialMetadata?: PageMetadata;
    defaultTitle?: string;
    defaultDescription?: string;
}

const extractTitleFromMetadata = (title: string | TitleMetadata | undefined, fallback: string): TitleMetadata => {
    if (!title) {
        return { default: fallback };
    }
    
    if (typeof title === 'string') {
        return { default: title };
    }
    
    return title;
};

const createTitleString = (titleObj: TitleMetadata): string => {
    return titleObj.absolute || titleObj.default || titleObj.template || '';
};

export const useMetadataForm = ({
    initialMetadata,
    defaultTitle = 'Title',
    defaultDescription = 'This is the information that will show up on search engines below your page title.',
}: UseMetadataFormProps) => {

    const initialTitle = useMemo(() => initialMetadata?.title, [initialMetadata?.title]);
    const initialDesc = useMemo(() => initialMetadata?.description, [initialMetadata?.description]);
    
    const initialTitleObj = useMemo(() => 
        extractTitleFromMetadata(initialTitle, defaultTitle), 
        [initialTitle, defaultTitle]
    );
    
    const isSimpleTitle = typeof initialTitle === 'string' || !initialTitle;
    
    const [titleObject, setTitleObject] = useState<TitleMetadata>(initialTitleObj);
    const [description, setDescription] = useState(
        initialDesc ?? defaultDescription,
    );
    const [isDirty, setIsDirty] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);

    const title = createTitleString(titleObject);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setTitleObject(prev => ({ ...prev, default: newValue }));
        setIsDirty(true);
    };

    const handleTitleTemplateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setTitleObject(prev => ({ ...prev, template: newValue }));
        setIsDirty(true);
    };

    const handleTitleAbsoluteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setTitleObject(prev => ({ ...prev, absolute: newValue }));
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
        setTitleObject(initialTitleObj);
        setDescription(initialDesc ?? defaultDescription);
        setUploadedImage(null);
        setIsDirty(false);
    };

    useEffect(() => {
        setTitleObject(initialTitleObj);
        setDescription(initialDesc ?? defaultDescription);
    }, [initialTitleObj, initialDesc, defaultDescription]);

    const getFinalTitleMetadata = (): string | TitleMetadata => {
        if (isSimpleTitle) {
            return titleObject.default || '';
        }
        
        if (titleObject.default && !titleObject.template && !titleObject.absolute) {
            return titleObject.default;
        }
        
        if (titleObject.template || titleObject.absolute) {
            return titleObject;
        }
        
        return titleObject.default || '';
    };

    return {
        title,
        titleObject,
        description,
        isDirty,
        uploadedImage,
        isSimpleTitle,
        handleTitleChange,
        handleTitleTemplateChange,
        handleTitleAbsoluteChange,
        handleDescriptionChange,
        handleImageSelect,
        handleDiscard,
        setTitle: (value: string) => {
            setTitleObject(prev => ({ ...prev, default: value }));
        },
        setDescription,
        setIsDirty,
        getFinalTitleMetadata,
    };
};