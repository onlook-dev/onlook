import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';

export const ActionButtons = ({
    disabled,
    handleImageEvent,
    handleScreenshot,
}: {
    disabled: boolean;
    handleImageEvent: (file: File, fileName: string) => Promise<void>;
    handleScreenshot: () => Promise<void>;
}) => {

    const handleOpenFileDialog = (e: React.MouseEvent) => {
        e.preventDefault();
        const inputElement = document.createElement('input');
        inputElement.type = 'file';
        inputElement.accept = 'image/*';
        inputElement.onchange = async () => {
            if (inputElement.files && inputElement.files.length > 0) {
                const file = inputElement.files[0];
                if (!file) {
                    return;
                }
                const fileName = file.name;
                await handleImageEvent(file, fileName);
            }
        };
        inputElement.click();
    };

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant={'ghost'}
                            size={'icon'}
                            className="w-9 h-9 text-foreground-tertiary group hover:bg-transparent cursor-pointer"
                            disabled={disabled}
                            onMouseDown={(e) => {
                                e.currentTarget.blur();
                            }}
                        >
                            <Icons.Image
                                className={cn(
                                    'w-5 h-5',
                                    disabled
                                        ? 'text-foreground-tertiary'
                                        : 'group-hover:text-foreground',
                                )}
                            />
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipPortal>
                    <TooltipContent side="top" sideOffset={5}>
                        {disabled ? 'Select an element to start' : 'Add Image or Screenshot'}
                    </TooltipContent>
                </TooltipPortal>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleOpenFileDialog} disabled={disabled}>
                    <Icons.Upload className="mr-2 h-4 w-4" />
                    Upload Image
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleScreenshot} disabled={disabled}>
                    <Icons.Laptop className="mr-2 h-4 w-4" />
                    Add Screenshot
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
