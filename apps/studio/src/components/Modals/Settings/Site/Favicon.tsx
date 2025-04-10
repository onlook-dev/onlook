import React, { useCallback, useState } from 'react';
import { Button } from '@onlook/ui/button';

export const Favicon: React.FC<{ onImageSelect: (file: File) => void }> = ({ onImageSelect }) => {
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
        document.getElementById('favicon-upload')?.click();
    }, []);

    const saveImage = async (file: File) => {
        const url = URL.createObjectURL(file);
        setSelectedImage(url);
        onImageSelect(file);
    };

    return (
        <div className="p-2">
            <div
                className={`group h-16 w-16 bg-background-secondary rounded flex items-center justify-center p-4 
                    ${isDragging ? 'border-2 border-dashed border-primary' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                    backgroundImage: selectedImage ? `url(${selectedImage})` : 'none',
                }}
            >
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="favicon-upload"
                    onChange={handleFileSelect}
                />
                <img src={selectedImage ?? ''} />
            </div>
            <UploadButton onButtonClick={handleButtonClick} />
        </div>
    );
};

const UploadButton: React.FC<{ onButtonClick: (e: React.MouseEvent) => void }> = ({
    onButtonClick,
}) => (
    <Button
        variant="ghost"
        className="flex items-center gap-2 mt-2 px-4 py-0 backdrop-blur-sm rounded border border-foreground-tertiary/20"
        type="button"
        onClick={onButtonClick}
    >
        <span>Upload Image</span>
    </Button>
);
