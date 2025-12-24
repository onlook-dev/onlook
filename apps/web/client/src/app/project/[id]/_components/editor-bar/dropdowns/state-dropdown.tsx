import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';

export const StateDropdown = () => {
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="toolbar"
                    className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                >
                    <Icons.StateCursor className="h-4 w-4 min-h-4 min-w-4" />
                    <span className="text-sm">State</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[120px] mt-1 p-1 rounded-lg">
                <DropdownMenuItem className="flex items-center px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white">
                    Default
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
