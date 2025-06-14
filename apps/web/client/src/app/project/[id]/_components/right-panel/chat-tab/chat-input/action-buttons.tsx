import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { useEditorEngine } from '@/components/store/editor';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { toast } from '@onlook/ui/sonner';
import { useRef } from 'react';

export const ActionButtons = ({
    disabled,
    handleImageEvent,
}: {
    disabled: boolean;
    handleImageEvent: (file: File, fileName: string) => Promise<void>;
}) => {
    const editorEngine = useEditorEngine();
    const triggerRef = useRef<HTMLButtonElement>(null);

    const handleOpenFileDialog = () => {
        triggerRef.current?.blur();
        
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

    const handleScreenshot = async () => {
        triggerRef.current?.blur();
        
        try {
            const frameView = editorEngine.frames.getAll().find(f => !!f.view)?.view;
            if (!frameView) {
                toast.error('No active frame found to capture screenshot');
                return;
            }
            
            const { mimeType, data: screenshotData } = await frameView.captureScreenshot();
            
            const base64Data = screenshotData.includes(',') ? screenshotData.split(',')[1] : screenshotData;
            if (!base64Data) {
                toast.error('Failed to capture screenshot');
                return;
            }
            
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });
            const file = new File([blob], 'Screenshot', { type: mimeType });
            
            await handleImageEvent(file, 'Screenshot');
        } catch (error) {
            console.error('Failed to capture screenshot:', error);
            toast.error('Failed to capture screenshot');
        }
    };

    return (
        <div className="flex flex-row justify-end gap-1.5">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        ref={triggerRef}
                        variant={'ghost'}
                        size={'icon'}
                        className="w-9 h-9 text-foreground-tertiary group hover:bg-transparent cursor-pointer"
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
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                        onClick={handleOpenFileDialog}
                        disabled={disabled}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <Icons.Image className="w-4 h-4" />
                        <span>Upload Image</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={handleScreenshot}
                        disabled={disabled}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <Icons.Desktop className="w-4 h-4" />
                        <span>Screenshot</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
