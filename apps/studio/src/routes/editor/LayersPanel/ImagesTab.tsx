import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

const ImagesTab = observer(() => {
    const [imageFiles, setImageFiles] = useState<string[]>([]);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    return (
        <div className="w-full">
            {imageFiles.length === 0 ? (
                <div className="h-screen flex items-center justify-center text-center opacity-70">
                    <div>
                        <Button
                            variant={'ghost'}
                            size={'icon'}
                            className="p-2 w-fit h-fit hover:bg-background-onlook"
                        >
                            <Icons.Plus />
                        </Button>
                        <span className="block w-2/3 mx-auto text-sm">
                            Upload images using the Plus icon
                        </span>
                    </div>
                </div>
            ) : (
                <div className="w-full flex flex-wrap gap-2">
                    {imageFiles.map((imageName) => (
                        <div key={imageName} className="relative group flex-shrink-0 w-[120px]">
                            <div className="w-full h-[120px] flex flex-col justify-center rounded-lg overflow-hidden items-center">
                                <img
                                    className="w-full h-full object-cover"
                                    src={imageName}
                                    alt={imageName.split('/').pop()}
                                />
                            </div>
                            <span className="text-xs block w-full text-center truncate">
                                {imageName.split('/').pop()}
                            </span>
                            <div
                                className={`absolute right-2 top-2 ${
                                    activeDropdown === imageName ? 'opacity-100' : 'opacity-0'
                                } group-hover:opacity-100 transition-opacity duration-300`}
                            >
                                <DropdownMenu
                                    onOpenChange={(isOpen) =>
                                        setActiveDropdown(isOpen ? imageName : null)
                                    }
                                >
                                    <DropdownMenuTrigger>
                                        <Button
                                            variant={'ghost'}
                                            className="bg-background p-1 inline-flex items-center justify-center h-auto w-auto rounded shadow-sm"
                                        >
                                            <Icons.DotsHorizontal className="text-foreground dark:text-white w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="rounded-md bg-background">
                                        <DropdownMenuItem asChild>
                                            <Button
                                                variant={'ghost'}
                                                className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                            >
                                                <span className="flex w-full text-smallPlus">
                                                    <Icons.Pencil className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                                    <span>Rename</span>
                                                </span>
                                            </Button>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Button
                                                variant={'ghost'}
                                                className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                            >
                                                <span className="flex w-full text-smallPlus">
                                                    <Icons.Trash className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                                    <span>Delete</span>
                                                </span>
                                            </Button>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Button
                                                variant={'ghost'}
                                                className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                            >
                                                <span className="flex w-full text-smallPlus">
                                                    <Icons.File className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                                    <span>Open Folder</span>
                                                </span>
                                            </Button>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default ImagesTab;
