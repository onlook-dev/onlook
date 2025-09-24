'use client';

import { useState } from 'react';
import { observer } from 'mobx-react-lite';

import { BrandTabValue, LeftPanelTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { toNormalCase } from '@onlook/utility';

import { useEditorEngine } from '@/components/store/editor';
import { useDropdownControl } from '../../hooks/use-dropdown-manager';
import { useTextControl } from '../../hooks/use-text-control';
import { HoverOnlyTooltip } from '../../hover-tooltip';
import { ToolbarButton } from '../../toolbar-button';
import { FontFamily } from './font-family';

export const FontFamilySelector = observer(() => {
    const editorEngine = useEditorEngine();
    const [search, setSearch] = useState('');
    const { handleFontFamilyChange, textState } = useTextControl();
    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'font-family-dropdown',
    });

    const filteredFonts = editorEngine.font.fonts.filter((font) =>
        font.family.toLowerCase().includes(search.toLowerCase()),
    );

    const handleClose = () => {
        onOpenChange(false);
        editorEngine.state.brandTab = null;
        if (editorEngine.state.leftPanelTab === LeftPanelTabValue.BRAND) {
            editorEngine.state.leftPanelTab = null;
        }
        setSearch('');
    };

    return (
        <DropdownMenu
            open={isOpen}
            modal={false}
            onOpenChange={(v) => {
                onOpenChange(v);
                if (!v) editorEngine.state.brandTab = null;
            }}
        >
            <HoverOnlyTooltip
                content="Font Family"
                side="bottom"
                className="mt-1"
                hideArrow
                disabled={isOpen}
            >
                <DropdownMenuTrigger asChild>
                    <ToolbarButton
                        isOpen={isOpen}
                        className="flex items-center gap-2 px-3"
                        aria-label="Font Family Selector"
                    >
                        <span className="truncate text-sm">
                            {toNormalCase(textState.fontFamily) || 'Sans Serif'}
                        </span>
                    </ToolbarButton>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuContent
                side="bottom"
                align="start"
                className="bg-background border-border mt-1 flex max-h-[400px] min-w-[300px] flex-col overflow-y-auto rounded-xl border p-0 shadow-lg"
            >
                <div className="border-border flex items-center justify-between border-b py-1.5 pr-2.5 pl-4">
                    <h2 className="text-foreground text-sm font-normal">Fonts</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-background-secondary h-7 w-7 rounded-md"
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
                        className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                        aria-label="Search fonts"
                        tabIndex={0}
                    />
                    <div className="text-muted-foreground mt-2 mb-1 text-sm">Brand fonts</div>
                </div>
                <div className="divide-border flex-1 divide-y overflow-y-auto px-2 pb-2">
                    {filteredFonts.length === 0 ? (
                        <div className="flex h-20 items-center justify-center">
                            <span className="text-muted-foreground text-sm">No fonts found</span>
                        </div>
                    ) : (
                        filteredFonts.map((font) => (
                            <div key={font.id} className="py-1">
                                <FontFamily
                                    name={font.family}
                                    onSetFont={() => handleFontFamilyChange(font)}
                                    isActive={
                                        textState.fontFamily.toLowerCase() === font.id.toLowerCase()
                                    }
                                />
                            </div>
                        ))
                    )}
                </div>
                <div className="border-border bg-background sticky bottom-0 border-t p-4">
                    <Button
                        variant="secondary"
                        size="lg"
                        className="w-full rounded-md text-sm font-medium"
                        aria-label="Manage Brand fonts"
                        tabIndex={0}
                        onClick={() => {
                            editorEngine.state.brandTab = BrandTabValue.FONTS;
                            editorEngine.state.leftPanelTab = LeftPanelTabValue.BRAND;
                            onOpenChange(false);
                        }}
                    >
                        Manage Brand fonts
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
