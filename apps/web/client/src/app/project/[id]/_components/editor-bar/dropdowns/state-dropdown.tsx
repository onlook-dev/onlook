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
                    className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex cursor-pointer items-center gap-2 rounded-lg border hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                >
                    <Icons.StateCursor className="h-4 min-h-4 w-4 min-w-4" />
                    <span className="text-sm">State</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="mt-1 min-w-[120px] rounded-lg p-1">
                <DropdownMenuItem className="text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border flex items-center rounded-md border px-2 py-1.5 text-sm data-[highlighted]:text-white">
                    Default
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
