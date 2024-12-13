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
import { motion, AnimatePresence } from 'framer-motion';

const ShareProject = () => {
    const [isPublished, setIsPublished] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

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

    const handleCopyUrl = async () => {
        await navigator.clipboard.writeText('http://localhost:3000');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
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

            <DropdownMenuContent align="end" className="w-64">
                {/* Public/Private Selector */}
                <div className="flex flex-row p-1 w-full">
                    <div className="flex flex-row p-0.5 w-full bg-background-secondary rounded">
                        <Button
                            size={'sm'}
                            className={`h-full w-full px-2 py-1.5 bg-background-secondary rounded-sm ${
                                isPublished
                                    ? 'bg-background-tertiary hover:bg-background-tertiary'
                                    : 'hover:bg-background-tertiary/50'
                            }`}
                            variant={'ghost'}
                            onClick={() => !isPublished && setIsPublished(true)}
                        >
                            <Icons.Globe
                                className={`mr-2 h-4 w-4 ${
                                    !isPublished
                                        ? 'text-foreground-secondary hover:text-foreground-onlook'
                                        : ''
                                }`}
                            />
                            Public
                        </Button>
                        <Button
                            size={'sm'}
                            className={`h-full w-full px-2 py-1.5 bg-background-secondary rounded-sm ${
                                !isPublished
                                    ? 'bg-background-tertiary hover:bg-background-tertiary'
                                    : 'hover:bg-background-tertiary/50'
                            }`}
                            variant={'ghost'}
                            onClick={() => isPublished && setIsPublished(false)}
                        >
                            <Icons.LockClosed
                                className={`mr-2 h-4 w-4 ${
                                    isPublished
                                        ? 'text-foreground-secondary hover:text-foreground-onlook'
                                        : ''
                                }`}
                            />
                            Private
                        </Button>
                    </div>
                </div>

                {isPublished && (
                    <>
                        <DropdownMenuItem
                            className="text-small hover:bg-transparent focus:bg-transparent"
                            onSelect={(e) => e.preventDefault()} // Prevents menu from closing on click
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center">
                                    <Icons.Globe className="mr-2 h-4 w-4 text-foreground-secondary" />
                                    <a
                                        href="http://localhost:3000"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline text-foreground hover:text-accent-foreground"
                                    >
                                        localhost:3000
                                    </a>
                                </div>
                                <button
                                    className="absolute right-1 top-0.5 w-5 h-5 rounded p-3.5 text-foreground-secondary hover:text-foreground-active hover:bg-background-tertiary/50 flex items-center justify-center"
                                    onClick={handleCopyUrl}
                                >
                                    <AnimatePresence initial={false} mode="wait">
                                        {!isCopied ? (
                                            <motion.div
                                                key="copy"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                exit={{ scale: 0 }}
                                                transition={{ duration: 0.04 }}
                                                className="absolute inset-0 flex items-center justify-center transition-all ease-in-out"
                                            >
                                                <Icons.Copy className="h-4 w-4" />
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="check"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                exit={{ scale: 0 }}
                                                transition={{ duration: 0.04 }}
                                                className="absolute inset-0 flex items-center justify-center text-teal-300 transition-all ease-in-out"
                                            >
                                                <Icons.Check className="h-4 w-4" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </button>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}

                <DropdownMenuItem className="text-small">
                    <div className="flex items-center">
                        <Icons.Gear className="mr-2 h-4 w-4 text-foreground-secondary" />
                        <span className="text-foreground-primary">Advanced Settings</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Deploy Button */}
                <div className="p-2">
                    <Button
                        className="w-full text-sm text-teal-200 border-teal-300 bg-teal-700 hover:bg-teal-400 hover:text-teal-100 hover:border-teal-200"
                        variant="default"
                        onClick={() => {
                            // Add deploy logic here
                            console.log('Deploying...');
                        }}
                    >
                        Deploy
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ShareProject;
