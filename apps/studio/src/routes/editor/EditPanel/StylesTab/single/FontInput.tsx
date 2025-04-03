import { useEditorEngine } from '@/components/Context';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState, useRef } from 'react';
import { Icons } from '@onlook/ui/icons';
import type { SingleStyle } from '@/lib/editor/styles/models';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import type { Font } from '@onlook/models/assets';
import { camelCase } from 'lodash';
import { toNormalCase } from '@onlook/utility';
import { LayersPanelTabValue } from '@/lib/models';

/**
 * Converts a font string like "__Advent_Pro_[hash], __Advent_Pro_Fallback_[hash], sans-serif" to "adventPro"
 */
function convertFontString(fontString: string): string {
    if (!fontString) {
        return '';
    }

    const firstFont = fontString.split(',')[0].trim();
    const cleanFont = firstFont.replace(/^__/, '').replace(/_[a-f0-9]+$/, '');
    const withoutFallback = cleanFont.replace(/_Fallback$/, '');

    return camelCase(withoutFallback);
}

export const FontInput = observer(
    ({
        elementStyle,
        onValueChange,
    }: {
        elementStyle: SingleStyle;
        onValueChange?: (key: string, value: string) => void;
    }) => {
        const editorEngine = useEditorEngine();
        const [value, setValue] = useState(elementStyle.defaultValue);
        const [isOpen, setIsOpen] = useState(false);

        useEffect(() => {
            if (!editorEngine.style.selectedStyle) {
                return;
            }
            const newValue = elementStyle.getValue(editorEngine.style.selectedStyle?.styles);
            setValue(convertFontString(newValue));
        }, [editorEngine.style.selectedStyle]);

        const handleValueChange = (newValue: Font) => {
            if (!newValue) {
                return;
            }
            setValue(newValue.id);
            editorEngine.style.updateFontFamily(elementStyle.key, newValue);
            onValueChange && onValueChange(elementStyle.key, newValue.id);
            setIsOpen(false);
        };

        const handleAddNewFont = () => {
            editorEngine.layersPanelTab = LayersPanelTabValue.FONTS;
        };

        return (
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <button className="p-[6px] w-32 px-2 text-start rounded border-none text-xs text-active bg-background-onlook/75 appearance-none focus:outline-none focus:ring-0 flex items-center justify-between">
                        <span style={{ fontFamily: value }}>
                            {toNormalCase(value) || 'Select font'}
                        </span>
                        <Icons.ChevronDown className="text-foreground-onlook" />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    className="backdrop-blur-lg z-10 rounded-lg p-0 shadow-xl overflow-hidden w-64 bg-background-onlook"
                    side="left"
                    align="start"
                >
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="flex items-center justify-between p-3 border-b border-border">
                            <h2 className="text-sm font-medium">Fonts</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <Icons.CrossL className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Search and Font List */}
                        <div className="flex-1 overflow-hidden">
                            <div className="flex flex-col overflow-y-auto max-h-64 p-2">
                                {editorEngine.font.fonts.map((font) => (
                                    <button
                                        key={font.id}
                                        className="w-full text-start p-2 text-sm hover:bg-background-secondary rounded-md flex items-center justify-between group"
                                        style={{ fontFamily: font.family }}
                                        onClick={() => handleValueChange(font)}
                                    >
                                        <span>{toNormalCase(font.family)}</span>
                                        {value === font.id && (
                                            <Icons.Check className="h-4 w-4 text-foreground-active" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-2 border-t border-border">
                            <button
                                onClick={handleAddNewFont}
                                className="w-full p-2 text-sm text-center rounded-md hover:bg-background-secondary text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Add a new font
                            </button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        );
    },
);
