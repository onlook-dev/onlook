import type { EditorEngine } from '@/components/store/editor/engine';
import { toast } from '@onlook/ui/sonner';
import { useCallback, useEffect, useMemo, useState } from 'react';

export enum ImageFit {
    FILL = 'fill',
    FIT = 'fit',
    STRETCH = 'stretch',
    CENTER = 'center',
    TILE = 'tile',
    AUTO = 'auto',
}

export const IMAGE_FIT_OPTIONS = [
    { value: ImageFit.FILL, label: 'Fill' },
    { value: ImageFit.FIT, label: 'Fit' },
    { value: ImageFit.STRETCH, label: 'Stretch' },
    { value: ImageFit.CENTER, label: 'Center' },
    { value: ImageFit.TILE, label: 'Tile' },
    { value: ImageFit.AUTO, label: 'Auto' },
] as const;

const FitToStyle: Record<ImageFit, Record<string, string>> = {
    [ImageFit.FILL]: {
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    },
    [ImageFit.FIT]: {
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    },
    [ImageFit.STRETCH]: {
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    },
    [ImageFit.CENTER]: {
        backgroundSize: 'auto',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    },
    [ImageFit.TILE]: {
        backgroundSize: 'auto',
        backgroundPosition: 'center',
        backgroundRepeat: 'repeat',
    },
    [ImageFit.AUTO]: {
        backgroundSize: 'auto',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    },
};

const cssToImageFit = (backgroundSize: string, backgroundRepeat: string): ImageFit => {
    if (backgroundSize === 'cover') return ImageFit.FILL;
    if (backgroundSize === 'contain') return ImageFit.FIT;
    if (backgroundSize === '100% 100%') return ImageFit.STRETCH;
    if (backgroundSize === 'auto' && backgroundRepeat === 'repeat') return ImageFit.TILE;
    if (backgroundSize === 'auto') return ImageFit.CENTER;
    return ImageFit.AUTO;
};

export const useBackgroundImage = (editorEngine: EditorEngine) => {
    const [fillOption, setFillOption] = useState<ImageFit>(ImageFit.FILL);

    const currentBackgroundImage = useMemo(() => {
        const selectedImage = editorEngine.style.selectedStyle?.styles.computed.backgroundImage;
        if (selectedImage && selectedImage !== 'none') {
            return selectedImage;
        }
        return null;
    }, [editorEngine.style.selectedStyle?.styles.computed.backgroundImage]);

    const currentBackgroundSize = useMemo(() => {
        const selectedStyle = editorEngine.style.selectedStyle?.styles.computed.backgroundSize;
        const selectedRepeat = editorEngine.style.selectedStyle?.styles.computed.backgroundRepeat;

        if (!selectedStyle) return null;

        return cssToImageFit(selectedStyle, selectedRepeat ?? 'no-repeat');
    }, [
        editorEngine.style.selectedStyle?.styles.computed.backgroundSize,
        editorEngine.style.selectedStyle?.styles.computed.backgroundRepeat,
    ]);

    const applyFillOption = useCallback(
        (fillOptionValue: ImageFit) => {
            try {
                const selected = editorEngine.elements.selected;

                if (!selected || selected.length === 0) {
                    console.warn('No elements selected to apply fill option');
                    return;
                }

                const cssStyles = FitToStyle[fillOptionValue];
                editorEngine.style.updateMultiple(cssStyles);
            } catch (error) {
                console.error('Failed to apply fill option:', error);
                toast.error('Failed to apply fill option', {
                    description: error instanceof Error ? error.message : String(error),
                });
            }
        },
        [],
    );

    const handleFillOptionChange = useCallback(
        (option: ImageFit) => {
            setFillOption(option);
            applyFillOption(option);
        },
        [applyFillOption],
    );

    const removeBackground = useCallback(async () => {
        try {
            const styles = {
                backgroundImage: 'none',
                backgroundSize: 'auto',
                backgroundRepeat: 'repeat',
                backgroundPosition: 'auto',
            };

            editorEngine.style.updateMultiple(styles);
            editorEngine.image.setSelectedImage(null);
            editorEngine.image.setPreviewImage(null);
        } catch (error) {
            console.error('Failed to remove background:', error);
            toast.error('Failed to remove background', {
                description: error instanceof Error ? error.message : String(error),
            });
        }
    }, [editorEngine]);

    useEffect(() => {
        if (currentBackgroundSize) {
            setFillOption(currentBackgroundSize);
        }
    }, [currentBackgroundSize]);

    useEffect(() => {
        return () => {
            if (editorEngine.image.isSelectingImage) {
                editorEngine.image.setIsSelectingImage(false);
                editorEngine.image.setSelectedImage(null);
                editorEngine.image.setPreviewImage(null);
            }
        };
    }, [editorEngine]);

    return {
        fillOption,
        currentBackgroundImage,
        handleFillOptionChange,
        removeBackground,
        ImageFit,
        IMAGE_FIT_OPTIONS,
    };
};
