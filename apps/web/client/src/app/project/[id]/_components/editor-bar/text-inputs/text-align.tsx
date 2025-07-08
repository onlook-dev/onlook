'use client';

import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useTextControl, type TextAlign } from '../hooks/use-text-control';
import { HoverOnlyTooltip } from '../hover-tooltip';

export const TextAlignSelector = observer(
    () => {
        const { handleTextAlignChange, textState } = useTextControl();
        return (
            <DropdownMenu modal={false}>
                <HoverOnlyTooltip
                    content="Text Align"
                    side="bottom"
                    className="mt-1"
                    hideArrow
                >
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="toolbar"
                            className="text-white border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex max-w-9 min-w-9 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
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
                        </Button>
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
                            className={`text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border rounded-md border px-2 py-1.5 data-[highlighted]:text-foreground cursor-pointer transition-colors duration-150 hover:bg-background-tertiary/20 hover:text-foreground ${textState.textAlign === value
                                ? 'bg-background-tertiary/20 border-border border text-white'
                                : ''
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }
);
