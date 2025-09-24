import { observer } from 'mobx-react-lite';

import { VARIANTS } from '@onlook/fonts';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { extractFontParts } from '@onlook/utility';

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
            <div className="max-h-[350px] flex-1 space-y-2 overflow-y-auto pb-6">
                {fontFiles.map((font, index) => (
                    <div
                        key={index}
                        className="flex flex-col space-y-2 rounded-lg border border-white/10 bg-black/10 p-3"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-normal">
                                    {extractFontParts(font.file.name).family}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                    {font.file.name}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <select
                                        className="hover:bg-background-hover hover:text-accent-foreground hover:border-border-hover cursor-pointer appearance-none rounded-md border border-white/10 bg-black/20 p-2 pr-8 text-sm text-white"
                                        value={font.weight}
                                        onChange={(e) => onWeightChange(index, e.target.value)}
                                    >
                                        {VARIANTS.map((variant) => (
                                            <option key={variant.value} value={variant.value}>
                                                {variant.name} ({variant.value})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                        <Icons.ChevronDown className="text-muted-foreground h-4 w-4" />
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-md border border-white/10 bg-black/20"
                                    onClick={() => onRemoveFont(index)}
                                >
                                    <Icons.Trash className="text-muted-foreground h-4 w-4" />
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
