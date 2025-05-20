import { useEditorEngine } from '@/components/store/editor';
import { DEFAULT_COLOR_NAME } from '@onlook/constants';
import type { TailwindColor } from '@onlook/models/style';
import { Color } from '@onlook/utility';
import { useCallback } from 'react';

interface ColorUpdateOptions {
    elementStyleKey: string;
    onValueChange?: (key: string, value: string) => void;
}


export const useColorUpdate = ({ elementStyleKey, onValueChange }: ColorUpdateOptions) => {
    const editorEngine = useEditorEngine();

    const handleColorUpdate = useCallback(
        (newValue: Color | TailwindColor) => {
            try {
                if (newValue instanceof Color) {
                    // Handle direct Color object updates
                    const valueString = newValue.toHex();
                    editorEngine.style.update(elementStyleKey, valueString);
                    onValueChange?.(elementStyleKey, valueString);
                } else {
                    // Handle custom color updates
                    let colorValue = newValue.originalKey;
                    
                    // Handle default color case
                    if (colorValue.endsWith(DEFAULT_COLOR_NAME)) {
                        colorValue = colorValue.split(`-${DEFAULT_COLOR_NAME}`)?.[0] ?? '';
                    }

                    // Update the style with custom color
                    editorEngine.style.updateCustom(elementStyleKey, colorValue);
                    onValueChange?.(elementStyleKey, newValue.lightColor);
                }
            } catch (error) {
                console.error('Error updating color:', error);
                // You might want to add error handling UI feedback here
            }
        },
        [editorEngine.style, elementStyleKey, onValueChange]
    );

    return {
        handleColorUpdate
    };
}; 