import { useEditorEngine } from '@/components/store/editor';
import { generateGradientCSS, type GradientState } from '@onlook/ui/color-picker';
import { useCallback } from 'react';

interface GradientUpdateOptions {
    onValueChange?: (key: string, value: string) => void;
}

export const useGradientUpdate = ({ onValueChange }: GradientUpdateOptions = {}) => {
    const editorEngine = useEditorEngine();

    const handleGradientUpdateEnd = useCallback(
        (gradient: GradientState) => {
            try {
                const cssValue = generateGradientCSS(gradient);
                editorEngine.style.updateMultiple({
                    backgroundColor: 'transparent',
                    backgroundImage: cssValue
                });

                onValueChange?.('backgroundColor', 'transparent');
                onValueChange?.('backgroundImage', cssValue);
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