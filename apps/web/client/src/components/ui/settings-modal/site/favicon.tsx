import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';

export interface FaviconRef {
    reset: () => void;
}

export const Favicon = forwardRef<
    FaviconRef,
    { onImageSelect: (file: File) => void; url?: string }
>(({ onImageSelect, url }, ref) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(url ?? null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const editorEngine = useEditorEngine();

    // useEffect(() => {
    //     if (url) {
    //         const image = editorEngine.image.assets.find((image) => url?.includes(image.fileName));
    //         if (image) {
    //             setSelectedImage(image.content);
    //         }
    //     }
    // }, [url]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const imageFile = files.find((file) => file.type.startsWith('image/'));
        if (imageFile) {
            await saveImage(imageFile);
        }
    }, []);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        const imageFile = files.find((file) => file.type.startsWith('image/'));
        if (imageFile) {
            await saveImage(imageFile);
        }
    }, []);

    const handleButtonClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        fileInputRef.current?.click();
    }, []);

    const reset = useCallback(() => {
        if (url) {
            const image = editorEngine.image.assets.find((image) => url?.includes(image.fileName));
            if (image) {
                setSelectedImage(image.content);
            } else {
                setSelectedImage(url);
            }
        } else {
            setSelectedImage(null);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [url, editorEngine.image?.assets]);

    useImperativeHandle(
        ref,
        () => ({
            reset,
        }),
        [reset],
    );

    const saveImage = useCallback(
        async (file: File) => {
            const url = URL.createObjectURL(file);
            setSelectedImage(url);
            onImageSelect(file);
        },
        [onImageSelect],
    );

    return (
        <div className="p-2">
            <div
                className={`group bg-background-secondary flex h-16 w-16 items-center justify-center rounded p-4 ${isDragging ? 'border-primary border-2 border-dashed' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                    backgroundImage: selectedImage ? `url(${selectedImage})` : 'none',
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="favicon-upload"
                    onChange={handleFileSelect}
                />
                {selectedImage && <img src={selectedImage} />}
            </div>
            <UploadButton onButtonClick={handleButtonClick} />
        </div>
    );
});

Favicon.displayName = 'Favicon';

export const UploadButton: React.FC<{
    onButtonClick: (e: React.MouseEvent) => void;
}> = ({ onButtonClick }) => (
    <Button
        variant="secondary"
        className="border-foreground-tertiary/20 mt-2 flex items-center gap-2 rounded border px-4 py-0 backdrop-blur-sm"
        type="button"
        onClick={onButtonClick}
    >
        <span>Upload Image</span>
    </Button>
);