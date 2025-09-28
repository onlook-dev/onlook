import type { ImageContentData } from "@onlook/models";
import { Button } from "@onlook/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { memo, useState } from "react";

export const ImageDropdownMenu = memo(({ image }: { image: ImageContentData }) => {
    // Stub state
    const [isOpen, setIsOpen] = useState(false);
    const [isDisabled] = useState(false);

    // Stub handlers
    const handleRenameImage = () => {
        // Stub rename handler
    };

    const handleDeleteImage = () => {
        // Stub delete handler
    };

    const handleMoveToFolder = () => {
        // Stub move handler
    };

    const handleCopyPath = () => {
        // Stub copy path handler
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-gray-200 dark:hover:bg-gray-700"
                    disabled={isDisabled}
                >
                    <Icons.DotsHorizontal className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleRenameImage} disabled={isDisabled}>
                    <Icons.Pencil className="mr-2 h-4 w-4" />
                    Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyPath} disabled={isDisabled}>
                    <Icons.Copy className="mr-2 h-4 w-4" />
                    Copy Path
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleMoveToFolder} disabled={isDisabled}>
                    <Icons.MoveToFolder className="mr-2 h-4 w-4" />
                    Move to Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                    onClick={handleDeleteImage} 
                    disabled={isDisabled}
                    className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                >
                    <Icons.Trash className="mr-2 h-4 w-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});