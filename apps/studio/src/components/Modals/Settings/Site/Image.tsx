import React, { useCallback, useState } from 'react';
import { Button } from '@onlook/ui/button';

const ImagePicker: React.FC<{ onImageSelect: (file: File) => void }> = ({ onImageSelect }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const imageFile = files.find((file) => file.type.startsWith('image/'));
        if (imageFile) {
            saveImage(imageFile);
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const imageFile = files.find((file) => file.type.startsWith('image/'));
        if (imageFile) {
            saveImage(imageFile);
        }
    }, []);

    const handleButtonClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        document.getElementById('image-upload')?.click();
    }, []);

    const saveImage = async (file: File) => {
        const url = URL.createObjectURL(file);
        setSelectedImage(url);
        onImageSelect(file);
    };

    return (
        <div className="flex flex-col gap-2 p-2 text-xs">
            <div
                className={`group h-32 w-60 bg-background-secondary rounded flex items-center justify-center p-4 
                    ${isDragging ? 'border-2 border-dashed border-primary' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                    backgroundImage: selectedImage ? `url(${selectedImage})` : 'none',
                }}
            >
                <UploadButton onButtonClick={handleButtonClick} />
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="image-upload"
                    onChange={handleFileSelect}
                />
            </div>
        </div>
    );
};

export const UploadButton: React.FC<{ onButtonClick: (e: React.MouseEvent) => void }> = ({
    onButtonClick,
}) => (
    <Button
        variant="secondary"
        className="flex items-center gap-2 px-4 py-0 backdrop-blur-sm rounded border border-foreground-tertiary/20 opacity-0 group-hover:opacity-90 transition-opacity"
        type="button"
        onClick={onButtonClick}
    >
        <span>Upload Image</span>
    </Button>
);

export default ImagePicker;
