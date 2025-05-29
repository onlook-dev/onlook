import { useEditorEngine } from '@/components/store/editor';
import { DEFAULT_COLOR_NAME } from '@onlook/constants';
import type { TailwindColor } from '@onlook/models/style';
import { Color } from '@onlook/utility';
import { useCallback, useState } from 'react';

interface ColorUpdateOptions {
    elementStyleKey: string;
    initialColor?: string;
    onValueChange?: (key: string, value: string) => void;
}

export const useColorUpdate = ({
    elementStyleKey,
    initialColor,
    onValueChange,
}: ColorUpdateOptions) => {
    const editorEngine = useEditorEngine();
    const [tempColor, setTempColor] = useState<Color>(Color.from(initialColor ?? '#000000'));

    const handleColorUpdateEnd = useCallback(
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
        [editorEngine.style, elementStyleKey, onValueChange],
    );

    const handleColorUpdate = useCallback((newColor: Color | TailwindColor) => {
        try {
            setTempColor(newColor instanceof Color ? newColor : Color.from(newColor.lightColor));
        } catch (error) {
            console.error('Error converting color:', error);
        }
    }, []);

    return {
        tempColor,
        handleColorUpdate,
        handleColorUpdateEnd,
    };
};
