import { useEditorEngine } from '@/components/Context';
import type { ImageContentData } from '@onlook/models';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@onlook/ui/dialog';
import { Input } from '@onlook/ui/input';
import React, { useState } from 'react';

interface ImageSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (image: ImageContentData) => void;
}

const ImageSelectionModal: React.FC<ImageSelectionModalProps> = ({ isOpen, onClose, onSelect }) => {
    const editorEngine = useEditorEngine();
    const [search, setSearch] = useState('');

    const filteredImages = editorEngine.image.assets.filter(
        (image) => !search || image.fileName.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <Dialog open={isOpen} onOpenChange={() => onClose()}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Select Image</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <Input
                        placeholder="Search images..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-8 text-xs"
                    />
                    <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto p-1">
                        {filteredImages.map((image) => (
                            <div
                                key={image.fileName}
                                className="aspect-square cursor-pointer hover:opacity-80 transition-opacity border rounded-md overflow-hidden"
                                onClick={() => {
                                    onSelect(image);
                                    onClose();
                                }}
                            >
                                <img
                                    src={image.content}
                                    alt={image.fileName}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ImageSelectionModal;
