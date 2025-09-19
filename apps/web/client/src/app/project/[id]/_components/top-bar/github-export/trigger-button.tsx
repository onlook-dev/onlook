import { Button } from '@onlook/ui/button';
import { DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';

export const TriggerButton = observer(() => {
    const colorClasses = 'border-input bg-background hover:bg-background-onlook text-foreground-primary hover:border-foreground-primary';
    const icon = <Icons.GitHubLogo className="mr-1 h-4 w-4" />;
    const text = 'Export to GitHub';

    return (
        <DropdownMenuTrigger asChild>
            <Button
                variant="default"
                size="sm"
                className={cn(
                    'px-3 flex items-center border-[0.5px] text-xs justify-center shadow-sm h-8 rounded-md transition-all duration-300 ease-in-out',
                    colorClasses,
                )}
            >
                {icon}
                {text}
            </Button>
        </DropdownMenuTrigger>
    );
});