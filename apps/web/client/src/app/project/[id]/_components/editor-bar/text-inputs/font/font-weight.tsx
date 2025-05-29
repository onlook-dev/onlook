'use client';

import { VARIANTS } from '@onlook/fonts';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { convertFontWeight } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useTextControl } from '../../hooks/use-text-control';

export const FontWeightSelector = observer(
    () => {
        const { handleFontWeightChange, textState } = useTextControl();
        return (
            <DropdownMenu>
                <Tooltip>
                    <div>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="toolbar"
                                    className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex w-24 cursor-pointer items-center justify-start gap-2 rounded-lg border px-3 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                                >
                                    <span className="text-smallPlus">
                                        {convertFontWeight(textState.fontWeight)}
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="mt-1" hideArrow>
                            Font Weight
                        </TooltipContent>
                    </div>
                </Tooltip>
                <DropdownMenuContent align="center" className="mt-1 min-w-[120px] rounded-lg p-1">
                    {VARIANTS.map((weight) => (
                        <DropdownMenuItem
                            key={weight.value}
                            onClick={() => handleFontWeightChange(weight.value)}
                            className={`text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border flex items-center justify-between rounded-md border px-2 py-1.5 text-sm data-[highlighted]:text-white cursor-pointer transition-colors duration-150 hover:bg-background-tertiary/20 hover:text-foreground ${textState.fontWeight === weight.value
                                ? 'bg-background-tertiary/20 border-border border text-white'
                                : ''
                                }`}
                        >
                            {weight.name}
                            {textState.fontWeight === weight.value && (
                                <Icons.Check className="ml-2 h-4 w-4 text-foreground-primary" />
                            )}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }
);
