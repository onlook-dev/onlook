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

/**
 * Extracts the actual font name from a font file name
 * Removes file extensions, weight/style indicators, and other common suffixes
 */
const extractFontName = (fileName: string): string => {
    // Remove file extension
    let name = fileName.replace(/\.[^/.]+$/, '');

    // Common weight terms that might appear in font names
    const weightTerms = [
        'thin',
        'hairline',
        'extralight',
        'extra light',
        'ultralight',
        'ultra light',
        'light',
        'regular',
        'normal',
        'book',
        'medium',
        'semibold',
        'semi bold',
        'demibold',
        'demi bold',
        'bold',
        'extrabold',
        'extra bold',
        'ultrabold',
        'ultra bold',
        'black',
        'heavy',
        'extrablack',
        'extra black',
        'ultrablack',
        'ultra black',
        'lightitalic',
        'light italic',
        'bolditalic',
        'bold italic',
        'mediumitalic',
        'medium italic',
        'blackitalic',
        'black italic',
        'extralightitalic',
        'extrabolditalic',
    ];

    // Common style terms
    const styleTerms = ['italic', 'oblique', 'slanted', 'kursiv', 'mediumitalic', 'medium italic'];

    // Create a regex pattern for all weight and style terms
    const allTerms = [...new Set([...weightTerms, ...styleTerms])].map((term) =>
        term.replace(/\s+/g, '\\s+'),
    );
    const termPattern = new RegExp(`[-_\\s]+(${allTerms.join('|')})(?:[-_\\s]+|$)`, 'gi');

    // Remove weight and style terms
    name = name.replace(termPattern, '');

    // Remove numeric weights (100, 200, 300, etc.)
    name = name.replace(/[-_\\s]+\d+(?:wt|weight)?(?:[-_\\s]+|$)/gi, '');
    name = name.replace(/\s*\d+\s*$/g, '');

    // Remove any trailing hyphens, underscores, or spaces
    name = name.replace(/[-_\s]+$/g, '');

    // Replace hyphens and underscores with spaces
    name = name.replace(/[-_]+/g, ' ');

    // Capitalize each word
    name = name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    return name.trim();
};

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
                                    {extractFontName(font.file.name)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {font.file.name}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <select
                                        className="appearance-none bg-black/20 border border-white/10 rounded-md text-sm p-2 pr-8 text-white"
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
