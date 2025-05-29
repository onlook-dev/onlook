'use client';

import { useEditorEngine } from '@/components/store/editor';
import { BrandTabValue, LeftPanelTabValue } from '@onlook/models';
import type { Font } from '@onlook/models/assets';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { toNormalCase } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTextControl } from '../../hooks/use-text-control';
import { FontFamily } from './font-family';

export const FontFamilySelector = observer(() => {
    const editorEngine = useEditorEngine();
    const [fonts, setFonts] = useState<Font[]>([]);
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const { handleFontFamilyChange, textState } = useTextControl();

    useEffect(() => {
        (async () => {
            try {
                const fonts = await editorEngine.font.scanFonts();
                setFonts(fonts);
            } catch (error) {
                console.error('Failed to scan fonts:', error);
            }
        })();
    }, []);

    // Filter fonts by search
    const filteredFonts = fonts.filter((font) =>
        font.family.toLowerCase().includes(search.toLowerCase()),
    );

    const handleClose = () => {
        setOpen(false);
        editorEngine.state.brandTab = null;
        if (editorEngine.state.leftPanelTab === LeftPanelTabValue.BRAND) {
            editorEngine.state.leftPanelTab = null;
        }
        setSearch('');
    };

    return (
        <Popover
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                if (!v) editorEngine.state.brandTab = null;
            }}
        >
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="toolbar"
                            className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex cursor-pointer items-center gap-2 rounded-lg border px-3 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                            aria-label="Font Family Selector"
                            tabIndex={0}
                            onClick={handleClose}
                        >
                            <span className="truncate text-sm">
                                {toNormalCase(textState.fontFamily)}
                            </span>
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="mt-1" hideArrow>
                    Font Family
                </TooltipContent>
            </Tooltip>
            <PopoverContent
                side="bottom"
                align="start"
                className="mt-1 min-w-[300px] max-h-[400px] overflow-y-auto rounded-xl p-0 bg-background shadow-lg border border-border flex flex-col"
            >
                <div className="flex justify-between items-center pl-4 pr-2.5 py-1.5 border-b border-border">
                    <h2 className="text-sm font-normal text-foreground">Fonts</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md hover:bg-background-secondary"
                        onClick={handleClose}
                    >
                        <Icons.CrossS className="h-4 w-4" />
                    </Button>
                </div>
                <div className="px-4 py-2">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search fonts..."
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label="Search fonts"
                        tabIndex={0}
                    />
                    <div className="text-sm text-muted-foreground mb-1 mt-2">Brand fonts</div>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2 divide-y divide-border">
                    {filteredFonts.length === 0 ? (
                        <div className="flex justify-center items-center h-20">
                            <span className="text-sm text-muted-foreground">No fonts found</span>
                        </div>
                    ) : (
                        filteredFonts.map((font) => (
                            <div key={font.id} className="py-1">
                                <FontFamily
                                    name={font.family}
                                    onSetFont={() => handleFontFamilyChange(font)}
                                    isActive={textState.fontFamily.toLowerCase() === font.id.toLowerCase()}
                                />
                            </div>
                        ))
                    )}
                </div>
                <div className="p-4 border-t border-border bg-background sticky bottom-0">
                    <Button
                        variant="secondary"
                        size="lg"
                        className="w-full rounded-md text-sm font-medium"
                        aria-label="Manage Brand fonts"
                        tabIndex={0}
                        onClick={() => {
                            editorEngine.state.brandTab = BrandTabValue.FONTS;
                            editorEngine.state.leftPanelTab = LeftPanelTabValue.BRAND;

                            setOpen(false);
                        }}
                    >
                        Manage Brand fonts
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
});
