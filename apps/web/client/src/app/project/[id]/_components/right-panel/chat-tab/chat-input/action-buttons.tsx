import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';

export const ActionButtons = ({
    disabled,
    handleImageEvent,
}: {
    disabled: boolean;
    handleImageEvent: (file: File, fileName: string) => Promise<void>;
}) => {

    const handleOpenFileDialog = (e: React.MouseEvent<HTMLButtonElement>) => {
        // Removes focus from the button to prevent tooltip from showing
        e.currentTarget.blur();
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
        <div className="flex flex-row justify-start gap-1.5">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={'ghost'}
                        size={'icon'}
                        className="w-9 h-9 text-foreground-tertiary group hover:bg-transparent cursor-pointer"
                        onClick={handleOpenFileDialog}
                        disabled={disabled}
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
                </TooltipTrigger>
                <TooltipPortal>
                    <TooltipContent side="top" sideOffset={5}>
                        {disabled ? 'Select an element to start' : 'Upload Image Reference'}
                    </TooltipContent>
                </TooltipPortal>
            </Tooltip>
            <Tooltip>
                <TooltipPortal>
                    <TooltipContent side="top" sideOffset={5}>
                        {disabled
                            ? 'Select an element to start'
                            : 'Add screenshot of the current page'}
                    </TooltipContent>
                </TooltipPortal>
            </Tooltip>
            <Button
                variant={'outline'}
                className="w-fit h-fit py-0.5 px-2.5 text-foreground-tertiary hidden cursor-pointer"
            >
                <Icons.FilePlus className="mr-2" />
                <span className="text-smallPlus">File Reference</span>
            </Button>
        </div>
    );
};
