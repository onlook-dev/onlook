import { Hotkey } from '@/components/hotkey';
import { ChatType } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { HoverOnlyTooltip } from '../../../editor-bar/hover-tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

interface ChatModeToggleProps {
    chatMode: ChatType;
    onChatModeChange: (mode: ChatType) => void;
    disabled?: boolean;
}

export const ChatModeToggle = observer(({ chatMode, onChatModeChange, disabled = false }: ChatModeToggleProps) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleOpenMenu = () => {
            setIsOpen(true);
        };

        window.addEventListener('open-chat-mode-menu', handleOpenMenu);
        return () => window.removeEventListener('open-chat-mode-menu', handleOpenMenu);
    }, []);

        const getCurrentModeIcon = () => {
            return chatMode === ChatType.EDIT ? Icons.Build : Icons.Ask;
        };

        const getCurrentModeLabel = () => {
            return chatMode === ChatType.EDIT ? 'Build' : 'Ask';
        };

        const Icon = getCurrentModeIcon();

        return (
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <HoverOnlyTooltip 
                    className='mb-1'
                    content={
                        <span>
                            Open mode menu
                        </span>
                    }
                    side="top"
                    hideArrow
                >
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={disabled}
                            className={cn(
                                'h-8 px-2 text-foreground-onlook group flex items-center gap-1.5',
                                disabled && 'opacity-50 cursor-not-allowed'
                            )}
                        >
                            <Icon 
                                className={cn(
                                    'w-4 h-4',
                                    disabled 
                                        ? 'text-foreground-tertiary' 
                                        : chatMode === ChatType.ASK
                                            ? 'text-blue-200'
                                            : 'text-foreground-secondary group-hover:text-foreground'
                                )} 
                            />
                            <span className={cn(
                                "text-xs font-medium",
                                chatMode === ChatType.ASK && "text-blue-200"
                            )}>
                                {getCurrentModeLabel()}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                </HoverOnlyTooltip>
            <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem
                    onClick={() => onChatModeChange(ChatType.EDIT)}
                    className={cn(
                        'flex items-center gap-2 px-3 py-2',
                        chatMode === ChatType.EDIT && 'bg-background-onlook'
                    )}
                >
                    <Icons.Build className="w-4 h-4" />
                    <span>Build</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => onChatModeChange(ChatType.ASK)}
                    className={cn(
                        'flex items-center gap-2 px-3 py-2',
                        chatMode === ChatType.ASK && 'bg-background-onlook'
                    )}
                >
                    <Icons.Ask className="w-4 h-4" />
                    <span>Ask</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}); 