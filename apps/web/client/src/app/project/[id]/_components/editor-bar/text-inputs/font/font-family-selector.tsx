'use client';

import { useEditorEngine } from '@/components/store/editor';
import { BrandTabValue, LeftPanelTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { toNormalCase } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useDropdownControl } from '../../hooks/use-dropdown-manager';
import { useTextControl } from '../../hooks/use-text-control';
import { HoverOnlyTooltip } from '../../hover-tooltip';
import { ToolbarButton } from '../../toolbar-button';
import { FontFamily } from './font-family';

export const FontFamilySelector = observer(() => {
    const editorEngine = useEditorEngine();
    const { handleFontFamilyChange, textState } = useTextControl();
    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'font-family-dropdown',
    });

    // TODO: use file system like code tab
    useEffect(() => {
        if (!editorEngine.activeSandbox.session.provider) {
            return;
        }
        editorEngine.font.init();
    }, [editorEngine.activeSandbox.session.provider]);

    const handleClose = () => {
        onOpenChange(false);
        editorEngine.state.brandTab = null;
        if (editorEngine.state.leftPanelTab === LeftPanelTabValue.BRAND) {
            editorEngine.state.leftPanelTab = null;
        }
    };

    return (
        <DropdownMenu open={isOpen} modal={false} onOpenChange={(v) => {
            onOpenChange(v);
            if (!v) editorEngine.state.brandTab = null;
        }}>
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
                align="center"
                className="mt-1 min-w-[240px] max-h-[400px] overflow-y-auto rounded-xl p-0 bg-background shadow-lg border border-border flex flex-col"
            >
                <div className="flex-1 overflow-y-auto px-2 pb-2 pt-2 divide-y divide-border">
                    {editorEngine.font.fonts.length === 0 ? (
                        <div className="flex justify-center items-center flex-col h-20 text-center">
                            <Icons.Brand className="h-5 w-5 text-muted-foreground mb-1" />
                            <span className="text-sm text-muted-foreground">No fonts found <br /> Add fonts from the Brand Tab</span>
                        </div>
                    ) : (
                        editorEngine.font.fonts.map((font) => (
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
                            onOpenChange(false);
                        }}
                    >
                        Browse more fonts
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
