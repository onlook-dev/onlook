import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { ChatType } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Kbd } from '@onlook/ui/kbd';
import { cn } from '@onlook/ui/utils';

import { Hotkey } from '@/components/hotkey';
import { HoverOnlyTooltip } from '../../../editor-bar/hover-tooltip';

interface ChatModeToggleProps {
    chatMode: ChatType;
    onChatModeChange: (mode: ChatType) => void;
    disabled?: boolean;
}

export const ChatModeToggle = observer(
    ({ chatMode, onChatModeChange, disabled = false }: ChatModeToggleProps) => {
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
                    className="mb-1"
                    content={
                        <span>
                            Open mode menu <Kbd>{Hotkey.CHAT_MODE_TOGGLE.readableCommand}</Kbd>
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
                                'text-foreground-onlook group flex h-8 items-center gap-1.5 px-2',
                                disabled && 'cursor-not-allowed opacity-50',
                            )}
                        >
                            <Icon
                                className={cn(
                                    'h-4 w-4',
                                    disabled
                                        ? 'text-foreground-tertiary'
                                        : 'text-foreground-secondary group-hover:text-foreground',
                                )}
                            />
                            <span className="text-xs font-medium">{getCurrentModeLabel()}</span>
                        </Button>
                    </DropdownMenuTrigger>
                </HoverOnlyTooltip>
                <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem
                        onClick={() => onChatModeChange(ChatType.EDIT)}
                        className={cn(
                            'flex items-center gap-2 px-3 py-2',
                            chatMode === ChatType.EDIT && 'bg-background-onlook',
                        )}
                    >
                        <Icons.Build className="h-4 w-4" />
                        <span>Build</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => onChatModeChange(ChatType.ASK)}
                        className={cn(
                            'flex items-center gap-2 px-3 py-2',
                            chatMode === ChatType.ASK && 'bg-background-onlook',
                        )}
                    >
                        <Icons.Ask className="h-4 w-4" />
                        <span>Ask</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    },
);
