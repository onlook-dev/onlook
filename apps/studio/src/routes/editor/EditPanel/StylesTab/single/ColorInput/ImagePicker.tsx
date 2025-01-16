import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';

const ImagePickerContent: React.FC = () => {
    return (
        <div className="flex flex-col items-center gap-2 p-2 text-xs">
            <div className="group h-32 w-full bg-background-secondary rounded flex items-center justify-center p-4">
                <Button
                    variant="secondary"
                    className="flex items-center gap-2 px-4 py-0 backdrop-blur-sm rounded border border-foreground-tertiary/20 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Icons.Upload className="w-3 h-3" />
                    <span>Upload New Image</span>
                </Button>
            </div>

            {/* Fill dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger className="px-2 py-1 w-full flex items-center justify-between bg-background-secondary rounded text-foreground-primary hover:bg-background-secondary/90 transition-colors">
                    <span>Fill</span>
                    <Icons.ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52">
                    <DropdownMenuItem className="text-xs">Fill</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs">Fit</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs">Auto</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default ImagePickerContent;
