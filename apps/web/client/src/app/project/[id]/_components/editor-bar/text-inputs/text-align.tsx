'use client';

import { observer } from 'mobx-react-lite';

import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';

import type { TextAlign } from '../hooks/use-text-control';
import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { useTextControl } from '../hooks/use-text-control';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { ToolbarButton } from '../toolbar-button';

export const TextAlignSelector = observer(() => {
    const { handleTextAlignChange, textState } = useTextControl();
    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'text-align-dropdown',
    });

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <HoverOnlyTooltip
                content="Text Align"
                side="bottom"
                className="mt-1"
                hideArrow
                disabled={isOpen}
            >
                <DropdownMenuTrigger asChild>
                    <ToolbarButton
                        isOpen={isOpen}
                        className="flex min-w-9 items-center justify-center gap-2 px-2"
                    >
                        {(() => {
                            switch (textState.textAlign) {
                                case 'center':
                                    return <Icons.TextAlignCenter className="h-4 w-4" />;
                                case 'right':
                                    return <Icons.TextAlignRight className="h-4 w-4" />;
                                case 'justify':
                                    return <Icons.TextAlignJustified className="h-4 w-4" />;
                                case 'left':
                                default:
                                    return <Icons.TextAlignLeft className="h-4 w-4" />;
                            }
                        })()}
                    </ToolbarButton>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuContent
                align="center"
                className="mt-1 flex min-w-fit gap-1 rounded-lg p-1"
            >
                {[
                    { value: 'left' as TextAlign, icon: Icons.TextAlignLeft },
                    { value: 'center' as TextAlign, icon: Icons.TextAlignCenter },
                    { value: 'right' as TextAlign, icon: Icons.TextAlignRight },
                    { value: 'justify' as TextAlign, icon: Icons.TextAlignJustified },
                ].map(({ value, icon: Icon }) => (
                    <DropdownMenuItem
                        key={value}
                        onClick={() => handleTextAlignChange(value)}
                        className={`text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border data-[highlighted]:text-foreground hover:bg-background-tertiary/20 hover:text-foreground cursor-pointer rounded-md border px-2 py-1.5 transition-colors duration-150 ${
                            textState.textAlign === value
                                ? 'bg-background-tertiary/20 border-border border text-white'
                                : ''
                        }`}
                    >
                        <Icon className="h-4 w-4" />
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
