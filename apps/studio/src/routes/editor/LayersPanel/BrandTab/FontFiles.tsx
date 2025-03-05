import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';

export interface FontFile {
    name: string;
    file: File;
    weight: string;
    style: string;
}

interface FontFilesProps {
    fontFiles: FontFile[];
    onWeightChange: (index: number, weight: string) => void;
    onStyleChange: (index: number, style: string) => void;
    onRemoveFont: (index: number) => void;
}

const FontFiles = observer(
    ({ fontFiles, onWeightChange, onStyleChange, onRemoveFont }: FontFilesProps) => {
        if (fontFiles.length === 0) {
            return null;
        }

        return (
            <div className="space-y-2 flex-1 max-h-[350px] pb-6 overflow-y-auto">
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
                                onClick={() => onRemoveFont(index)}
                            >
                                <Icons.Trash className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 relative">
                                <select
                                    className="w-full appearance-none bg-black/30 border border-white/10 rounded-md text-sm p-2 pr-8 text-white"
                                    value={font.weight}
                                    onChange={(e) => onWeightChange(index, e.target.value)}
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
                                    onChange={(e) => onStyleChange(index, e.target.value)}
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
            </div>
        );
    },
);

export default FontFiles;
