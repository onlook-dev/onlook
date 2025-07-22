import type { EditorEngine } from '@/components/store/editor/engine';
import type { ImageContentData } from '@onlook/models';
import { imagePathToUrl } from '@onlook/utility';
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
        const selectedStyle = editorEngine.style.selectedStyle?.styles.computed.backgroundImage;
        if (selectedStyle && selectedStyle !== 'none') {
            const urlMatch = /url\(['"]?([^'"]+)['"]?\)/.exec(selectedStyle);
            return urlMatch ? urlMatch[1] : null;
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

    const applyBackgroundImage = useCallback(
        (imageData: ImageContentData, fillOptionValue: ImageFit) => {
            const selected = editorEngine.elements.selected;

            if (!selected || selected.length === 0) {
                console.warn('No elements selected to apply background image');
                return;
            }

            const url = imagePathToUrl(imageData.originPath);


            const cssStyles = FitToStyle[fillOptionValue];


            const styles = {
                backgroundImage: `url('/${url}')`,
                ...cssStyles,
            };

            editorEngine.style.updateMultiple(styles);
        },
        [editorEngine],
    );

    const handleFillOptionChange = useCallback(
        (option: ImageFit) => {
            setFillOption(option);

            const selectedImage = editorEngine.image.selectedImage;
            if (selectedImage) {
                applyBackgroundImage(selectedImage, option);
            }
        },
        [applyBackgroundImage, editorEngine.image.selectedImage],
    );

    const applySelectedImageAsBackground = useCallback(
        (image: ImageContentData) => {
            applyBackgroundImage(image, fillOption);
        },
        [applyBackgroundImage, fillOption],
    );

    const removeBackground = useCallback(() => {
        const styles = {
            backgroundImage: 'none',
            backgroundSize: 'auto',
            backgroundRepeat: 'repeat',
            backgroundPosition: 'auto',
        };
        editorEngine.style.updateMultiple(styles);
        editorEngine.image.setSelectedImage(null);
        editorEngine.image.setPreviewImage(null);
    }, [editorEngine]);

    useEffect(() => {
        if (currentBackgroundSize) {
            setFillOption(currentBackgroundSize);
        }
    }, [currentBackgroundSize]);

    useEffect(() => {
        const selectedImage = editorEngine.image.selectedImage;
        const isSelectingImage = editorEngine.image.isSelectingImage;
        
        if (selectedImage && isSelectingImage) {
            applySelectedImageAsBackground(selectedImage);
        }
    }, [editorEngine.image.selectedImage, editorEngine.image.isSelectingImage, applySelectedImageAsBackground]);

    useEffect(() => {
        return () => {
            if (editorEngine.image.isSelectingImage) {
                editorEngine.image.setIsSelectingImage(false);
                editorEngine.image.setSelectedImage(null);
            }
        };
    }, [editorEngine]);

    return {
        fillOption,
        currentBackgroundImage,
        currentBackgroundSize,
        handleFillOptionChange,
        applySelectedImageAsBackground,
        removeBackground,
        ImageFit,
        IMAGE_FIT_OPTIONS,
    };
};
