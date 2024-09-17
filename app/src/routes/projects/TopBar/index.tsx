import { Button } from '@/components/ui/button';
import ModeToggle from '../TopBar/ModeToggle';
import wordLogo from '@/assets/word-logo.svg';
import { PlusIcon, FilePlusIcon, DownloadIcon } from '@radix-ui/react-icons';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function TopBar() {
    return (
        <div className="flex flex-row h-12 px-12 items-center">
            <div className="flex-1 flex items-center justify-start mt-3">
                <img className="w-24" src={wordLogo} alt="Onlook logo" />
            </div>
            <ModeToggle />
            <div className="flex-1 flex justify-end space-x-2 mt-4 items-center">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="text-small text-text" variant="ghost">
                            <PlusIcon className="w-4 h-4 mr-2" />
                            New Project
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem
                            className={cn(
                                'focus:bg-blue-900 focus:text-blue-100',
                                'hover:bg-blue-900 hover:text-blue-100',
                            )}
                        >
                            <FilePlusIcon className="w-4 h-4 mr-2" />
                            Start from scratch
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className={cn(
                                'focus:bg-teal-900 focus:text-teal-100',
                                'hover:bg-teal-900 hover:text-teal-100',
                            )}
                        >
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Import existing project
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="w-8 h-8 p-0 bg-red-500 rounded-full">
                            {/* User avatar icon or initials can go here */}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem>Sign out</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
