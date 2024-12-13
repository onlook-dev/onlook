import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { useState } from 'react';

const ShareProject = () => {
    const [isPublished, setIsPublished] = useState(false);

    const handlePublish = () => {
        setIsPublished(true);
        // Add actual publish logic here
    };

    const handleUnpublish = () => {
        setIsPublished(false);
        // Add actual unpublish logic here
    };

    const handleOpenUrl = () => {
        window.open('http://localhost:3000', '_blank');
    };

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="default"
                            className="flex items-center border text-smallPlus justify-center shadow-sm bg-background hover:bg-background-onlook hover:text-accent-foreground disabled:text-foreground-onlook h-8 px-2.5 rounded-l-md hover:text-foreground-active/90 transition-all duration-300 ease-in-out"
                        >
                            <Icons.Globe className="mr-2 h-4 w-4" />
                            Publish
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Publish Project</TooltipContent>
            </Tooltip>

            <DropdownMenuContent align="end" className="w-56">
                {/* Public/Private Selector */}
                <div className="flex flex-row p-2 w-full">
                    <Button
                        size={'sm'}
                        className={`h-full w-full px-2 py-1.5 rounded-r-none ${
                            isPublished
                                ? 'bg-background-tertiary hover:bg-background-tertiary'
                                : 'hover:bg-background-tertiary/50 text-foreground-onlook'
                        }`}
                        variant={'ghost'}
                        onClick={() => !isPublished && setIsPublished(true)}
                    >
                        <Icons.Globe className="mr-2 h-4 w-4" />
                        Public
                    </Button>
                    <Button
                        size={'sm'}
                        className={`h-full w-full px-2 py-1.5 rounded-l-none ${
                            !isPublished
                                ? 'bg-background-tertiary hover:bg-background-tertiary'
                                : 'hover:bg-background-tertiary/50 text-foreground-onlook'
                        }`}
                        variant={'ghost'}
                        onClick={() => isPublished && setIsPublished(false)}
                    >
                        <Icons.LockClosed className="mr-2 h-4 w-4" />
                        Private
                    </Button>
                </div>

                <DropdownMenuSeparator />

                {isPublished && (
                    <>
                        <DropdownMenuItem onClick={handleOpenUrl}>
                            <Icons.Globe className="mr-2 h-4 w-4" />
                            <span>localhost:3000</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}

                <DropdownMenuItem>
                    <Icons.Gear className="mr-2 h-4 w-4" />
                    <span>Advanced Settings</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Deploy Button */}
                <div className="p-2">
                    <Button
                        className="w-full"
                        variant="default"
                        onClick={() => {
                            // Add deploy logic here
                            console.log('Deploying...');
                        }}
                    >
                        <Icons.Globe className="mr-2 h-4 w-4" />
                        Deploy
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ShareProject;
