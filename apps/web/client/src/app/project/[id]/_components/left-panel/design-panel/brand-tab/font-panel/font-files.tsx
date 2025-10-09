import { VARIANTS } from '@onlook/fonts';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { extractFontParts } from '@onlook/utility';
import { observer } from 'mobx-react-lite';

export interface FontFile {
    name: string;
    file: {
        name: string;
        buffer: number[];
    };
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
                        className="flex flex-col space-y-2 border border-white/10 rounded-lg p-3 bg-black/10"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-normal">
                                    {extractFontParts(font.file.name).family}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {font.file.name}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <select
                                        className="appearance-none bg-black/20 border border-white/10 rounded-md text-sm p-2 pr-8 text-white cursor-pointer hover:bg-background-hover hover:text-accent-foreground hover:border-border-hover"
                                        value={font.weight}
                                        onChange={(e) => onWeightChange(index, e.target.value)}
                                    >
                                        {VARIANTS.map((variant) => (
                                            <option key={variant.value} value={variant.value}>
                                                {variant.name} ({variant.value})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                        <Icons.ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 border border-white/10 bg-black/20 rounded-md"
                                    onClick={() => onRemoveFont(index)}
                                >
                                    <Icons.Trash className="h-4 w-4 text-muted-foreground" />
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
