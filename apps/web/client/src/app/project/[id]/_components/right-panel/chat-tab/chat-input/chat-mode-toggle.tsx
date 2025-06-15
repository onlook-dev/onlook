import { ChatType } from '@/app/api/chat/route';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';

interface ChatModeToggleProps {
    chatMode: ChatType;
    onModeChange: (mode: ChatType) => void;
    disabled?: boolean;
}

export const ChatModeToggle = ({ chatMode, onModeChange, disabled }: ChatModeToggleProps) => {
    const currentMode = chatMode === ChatType.EDIT ? 'Build' : 'Ask';
    const CurrentIcon = chatMode === ChatType.EDIT ? Icons.Build : Icons.Ask;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs font-medium text-foreground-tertiary hover:text-foreground hover:bg-background-secondary transition-colors"
                    disabled={disabled}
                    aria-label={`Current mode: ${currentMode}. Click to change chat mode`}
                >
                    <CurrentIcon className="w-3.5 h-3.5 mr-1.5" />
                    <span>{currentMode}</span>
                    <Icons.ChevronDown className="w-3 h-3 ml-1" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36 min-w-fit">
                <DropdownMenuItem
                    onClick={() => onModeChange(ChatType.EDIT)}
                    disabled={disabled}
                    className={cn(
                        "flex items-center gap-2 cursor-pointer transition-colors",
                        chatMode === ChatType.EDIT && "bg-accent"
                    )}
                >
                    <Icons.Build className="w-4 h-4" />
                    <span>Build</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => onModeChange(ChatType.ASK)}
                    disabled={disabled}
                    className={cn(
                        "flex items-center gap-2 cursor-pointer transition-colors",
                        chatMode === ChatType.ASK && "bg-accent"
                    )}
                >
                    <Icons.Ask className="w-4 h-4" />
                    <span>Ask</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}; 