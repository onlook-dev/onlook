import { useEditorEngine } from '@/components/store/editor';
import { DEFAULT_COLOR_NAME } from '@onlook/constants';
import type { TailwindColor } from '@onlook/models/style';
import { Color } from '@onlook/utility';
import { useCallback, useEffect, useState } from 'react';

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

    useEffect(() => {
        setTempColor(Color.from(initialColor ?? '#000000'));
    }, [initialColor]);

    const handleColorUpdateEnd = useCallback(
        (newValue: Color | TailwindColor) => {
            try {
                if (newValue instanceof Color) {
                    const valueString = newValue.toHex();
                    editorEngine.style.update(elementStyleKey, valueString);
                    onValueChange?.(elementStyleKey, valueString);
                } else {
                    let colorValue = newValue.originalKey;

                    if (colorValue.endsWith(DEFAULT_COLOR_NAME)) {
                        colorValue = colorValue.split(`-${DEFAULT_COLOR_NAME}`)?.[0] ?? '';
                    }

                    editorEngine.style.updateCustom(elementStyleKey, colorValue);
                    onValueChange?.(elementStyleKey, newValue.lightColor);
                }
            } catch (error) {
                console.error('Error updating color:', error);
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
