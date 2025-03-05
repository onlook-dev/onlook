import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { cn } from '@onlook/ui/utils';

interface FontFile {
    name: string;
    file: File;
    weight: string;
    style: string;
}

interface UploadModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onUpload: (fonts: FontFile[]) => void;
}

const UploadModal = observer(({ isOpen, onOpenChange, onUpload }: UploadModalProps) => {
    const [fontFiles, setFontFiles] = useState<FontFile[]>([]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files).map((file) => ({
                name: file.name.split('.')[0],
                file,
                weight: 'Regular (400)',
                style: 'Regular',
            }));
            setFontFiles([...fontFiles, ...newFiles]);
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (event.dataTransfer.files) {
            const newFiles = Array.from(event.dataTransfer.files).map((file) => ({
                name: file.name.split('.')[0],
                file,
                weight: 'Regular (400)',
                style: 'Regular',
            }));
            setFontFiles([...fontFiles, ...newFiles]);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const handleWeightChange = (index: number, weight: string) => {
        const updatedFiles = [...fontFiles];
        updatedFiles[index].weight = weight;
        setFontFiles(updatedFiles);
    };

    const handleStyleChange = (index: number, style: string) => {
        const updatedFiles = [...fontFiles];
        updatedFiles[index].style = style;
        setFontFiles(updatedFiles);
    };

    const handleRemoveFont = (index: number) => {
        const updatedFiles = [...fontFiles];
        updatedFiles.splice(index, 1);
        setFontFiles(updatedFiles);
    };

    const handleSave = () => {
        onUpload(fontFiles);
        onOpenChange(false);
        setFontFiles([]);
    };

    const handleCancel = () => {
        onOpenChange(false);
        setFontFiles([]);
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-xl bg-background-onlook/20">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-center">Upload a font</AlertDialogTitle>
                </AlertDialogHeader>

                {fontFiles.length === 0 ? (
                    <div
                        className="flex flex-col items-center justify-center p-8 border border-dashed border-white/20 rounded-lg bg-black/20 cursor-pointer"
                        onClick={() => document.getElementById('font-upload')?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        <div className="w-10 h-10 flex items-center justify-center rounded-md bg-black/30 border border-white/10 mb-4">
                            <svg
                                className="h-5 w-5 text-primary"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M12 17V3"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M7 8L12 3L17 8"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M20 21H4"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                        <p className="text-primary text-center mb-1">Click to upload</p>
                        <p className="text-sm text-muted-foreground text-center">
                            or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground text-center mt-4">
                            For maximum browser support, upload in
                            <br />
                            TTF, OTF, EOT and WOFF formats.
                        </p>
                        <input
                            id="font-upload"
                            type="file"
                            accept=".ttf,.otf,.eot,.woff,.woff2"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {fontFiles.map((font, index) => (
                            <div
                                key={index}
                                className="flex flex-col space-y-2 border border-white/10 rounded-lg p-3 bg-black/20"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <svg
                                            className="h-4 w-4 mr-2 text-muted-foreground"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            <path
                                                d="M13 2V9H20"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{font.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {font.file.name}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleRemoveFont(index)}
                                    >
                                        <Icons.Trash className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1 relative">
                                        <select
                                            className="w-full appearance-none bg-black/30 border border-white/10 rounded-md text-sm p-2 pr-8 text-white"
                                            value={font.weight}
                                            onChange={(e) =>
                                                handleWeightChange(index, e.target.value)
                                            }
                                        >
                                            <option value="Regular (400)">Regular (400)</option>
                                            <option value="Medium (500)">Medium (500)</option>
                                            <option value="Bold (700)">Bold (700)</option>
                                            <option value="Light (300)">Light (300)</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                            <Icons.ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div className="flex-1 relative">
                                        <select
                                            className="w-full appearance-none bg-black/30 border border-white/10 rounded-md text-sm p-2 pr-8 text-white"
                                            value={font.style}
                                            onChange={(e) =>
                                                handleStyleChange(index, e.target.value)
                                            }
                                        >
                                            <option value="Regular">Regular</option>
                                            <option value="Italic">Italic</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                            <Icons.ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div className="flex-none">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 border border-white/10 bg-black/30 rounded-md"
                                        >
                                            <Icons.Copy className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <Button
                            variant="outline"
                            className="w-full border-dashed"
                            onClick={() => document.getElementById('font-upload')?.click()}
                        >
                            <Icons.Plus className="h-4 w-4 mr-2" />
                            Add more fonts
                            <input
                                id="font-upload"
                                type="file"
                                accept=".ttf,.otf,.eot,.woff,.woff2"
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </Button>
                    </div>
                )}

                <AlertDialogFooter className="sm:justify-between">
                    <Button variant="ghost" onClick={handleCancel} className="text-sm">
                        Cancel
                    </Button>
                    <Button
                        variant="default"
                        onClick={handleSave}
                        disabled={fontFiles.length === 0}
                        className="rounded-md text-sm"
                    >
                        Save font files
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
});

export default UploadModal;
