import { useEditorEngine } from '@/components/store/editor';
import type { Gradient } from '@onlook/ui/color-picker';
import { useCallback } from 'react';

interface GradientUpdateOptions {
    onValueChange?: (key: string, value: string) => void;
}

export const useGradientUpdate = ({ onValueChange }: GradientUpdateOptions = {}) => {
    const editorEngine = useEditorEngine();

    const handleGradientUpdateEnd = useCallback(
        (gradient: Gradient) => {
            try {
                // Apply gradient via backgroundImage and clear backgroundColor
                editorEngine.style.update('backgroundImage', gradient.cssValue);
                editorEngine.style.update('backgroundColor', 'transparent');
                onValueChange?.('backgroundImage', gradient.cssValue);
                onValueChange?.('backgroundColor', 'transparent');
            } catch (error) {
                console.error('Error updating gradient:', error);
            }
        },
        [editorEngine.style, onValueChange],
    );

    return {
        handleGradientUpdateEnd,
    };
}; 