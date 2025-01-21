import { useEditorEngine } from '@/components/Context';
import { MessageContextType, type ImageMessageContext } from '@onlook/models/chat';
import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardHeader } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { cn } from '@onlook/ui/utils';
import { useState } from 'react';

export const PromptCreation = () => {
    const editorEngine = useEditorEngine();
    const [inputValue, setInputValue] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [selectedImages, setSelectedImages] = useState<ImageMessageContext[]>([]);

    const handleSubmit = (value: string) => {
        console.log(value);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        handleNewImageFiles(files);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        handleNewImageFiles(files);
    };

    const handleNewImageFiles = async (files: File[]) => {
        const imageFiles = files.filter((file) => file.type.startsWith('image/'));

        const imageContexts: ImageMessageContext[] = [];
        if (imageFiles.length > 0) {
            // Handle the dropped image files
            for (const file of imageFiles) {
                const imageContext = await createImageMessageContext(file);
                if (imageContext) {
                    imageContexts.push(imageContext);
                }
            }
        }
        console.log('imageContexts', imageContexts);
        setSelectedImages([...selectedImages, ...imageContexts]);
    };

    const handleRemoveImage = (imageContext: ImageMessageContext) => {
        setSelectedImages(selectedImages.filter((f) => f !== imageContext));
    };

    const createImageMessageContext = async (file: File): Promise<ImageMessageContext | null> => {
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result as string);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            return {
                type: MessageContextType.IMAGE,
                content: base64,
                displayName: file.name,
                mimeType: file.type,
            };
        } catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
    };

    return (
        <div
            className="flex items-center justify-center p-4"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Background placeholder */}
            {/* <div className={cn(
                "absolute inset-0 overflow-hidden bg-gradient-to-br from-foreground-tertiary to-background",
                isDragging && "from-foreground-secondary to-background-primary")
            }></div> */}
            {/* Content */}
            <Card className={cn('max-w-2xl mb-32 bg-background', isDragging && 'bg-background')}>
                <CardHeader>
                    <h2 className="text-2xl text-foreground-primary">
                        What kind of website do you want to make?
                    </h2>
                    <p className="text-sm text-foreground-secondary">
                        Paste a link, imagery, or more as inspiration for your next site
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-3 bg-background-secondary rounded p-4">
                        {selectedImages.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {selectedImages.map((file, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={file.content}
                                            alt={file.displayName}
                                            className="h-12 w-12 object-cover rounded-md"
                                        />
                                        <button
                                            onClick={() => handleRemoveImage(file)}
                                            className="absolute -top-2 -right-2 bg-background rounded-full p-1 
                                                     opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Icons.CrossCircled className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Input
                            className="w-full shadow-none border-none ring-0 bg-transparent focus-visible:bg-transparent"
                            placeholder="Paste a link, imagery, or more as inspiration"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSubmit(inputValue);
                                }
                            }}
                        />
                        <div className="flex justify-end gap-2 w-full">
                            <div className="flex gap-2 mr-auto">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="bg-background-secondary hover:border-0 focus:border-0"
                                    onClick={() => document.getElementById('image-input')?.click()}
                                >
                                    <input
                                        id="image-input"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                    <Icons.Image className="h-5 w-5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-gray-500 hover:text-gray-400 hover:bg-gray-800/70 hidden"
                                >
                                    <Icons.Link className="h-5 w-5" />
                                </Button>
                            </div>
                            <Button
                                variant="outline"
                                className="bg-background-secondary"
                                onClick={() => handleSubmit(inputValue)}
                            >
                                <Icons.ArrowRight className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PromptCreation;
