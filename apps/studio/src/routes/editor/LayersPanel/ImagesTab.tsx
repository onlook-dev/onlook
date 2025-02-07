import { useEditorEngine } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { debounce } from 'lodash';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useState } from 'react';

const ImagesTab = observer(() => {
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [uploadError, setUploadError] = useState<string | null>(null);
    const editorEngine = useEditorEngine();

    useEffect(() => {
        scanImages();
    }, []);

    const imageAssets = useMemo(() => {
        return editorEngine.image.assets;
    }, [editorEngine.image.assets]);

    const scanImages = () => {
        editorEngine.image.scanImages();
    };

    const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setUploadError(null);
        const files = Array.from(e.target.files || []);
        const imageFile = files.find((file) => file.type.startsWith('image/'));

        if (!imageFile) {
            setUploadError('Please select a valid image file');
            return;
        }

        try {
            await editorEngine.image.upload(imageFile);
        } catch (error) {
            setUploadError('Failed to upload image. Please try again.');
            console.error('Image upload error:', error);
        }
    };

    const handleClickAddButton = () => {
        const input = document.getElementById('images-upload');
        if (input) {
            input.click();
        }
    };

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setSearch(value);
        }, 300),
        [],
    );

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedSearch(e.target.value);
    };

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);

    const filteredImages = useMemo(() => {
        return imageAssets.filter((image) => image.fileName.includes(search));
    }, [imageAssets, search]);

    return (
        <div className="w-full">
            <input
                type="file"
                accept="image/*"
                className="hidden"
                id="images-upload"
                onChange={handleUploadFile}
                // multiple TODO: add multiple
            />
            {uploadError && (
                <div className="mb-2 px-3 py-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
                    {uploadError}
                </div>
            )}
            {imageAssets.length === 0 ? (
                <div className="h-screen flex items-center justify-center text-center opacity-70">
                    <div>
                        <Button
                            onClick={handleClickAddButton}
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
                <div className="w-full flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="relative w-full">
                            <input
                                placeholder="Search"
                                className="flex h-9 w-full rounded border-none bg-secondary px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:bg-background-active focus-visible:border-border-active focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                                type="text"
                                onChange={handleSearch}
                            />
                            <div className="absolute pointer-events-none inset-y-0 right-0 h-full flex px-2 items-center justify-center">
                                <Icons.MagnifyingGlass className="text-foreground-secondary" />
                            </div>
                        </div>
                        <Button variant={'ghost'} size={'icon'} onClick={handleClickAddButton}>
                            <Icons.Plus />
                        </Button>
                    </div>
                    <div className="w-full flex flex-wrap gap-2">
                        {filteredImages.map((image) => (
                            <div
                                key={image.fileName}
                                className="relative group flex-shrink-0 w-[120px]"
                            >
                                <div className="w-full h-[120px] flex flex-col justify-center rounded-lg overflow-hidden items-center">
                                    <img
                                        className="w-full h-full object-cover"
                                        src={image.content}
                                        alt={image.fileName}
                                    />
                                </div>
                                <span className="text-xs block w-full text-center truncate">
                                    {image.fileName}
                                </span>
                                <div
                                    className={`absolute right-2 top-2 ${
                                        activeDropdown === image.fileName
                                            ? 'opacity-100'
                                            : 'opacity-0'
                                    } group-hover:opacity-100 transition-opacity duration-300`}
                                >
                                    <DropdownMenu
                                        onOpenChange={(isOpen) =>
                                            setActiveDropdown(isOpen ? image.fileName : null)
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
                                                    <span className="flex w-full text-smallPlus items-center">
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
                                                    <span className="flex w-full text-smallPlus items-center">
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
                                                    <span className="flex w-full text-smallPlus items-center">
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
                </div>
            )}
        </div>
    );
});

export default ImagesTab;
