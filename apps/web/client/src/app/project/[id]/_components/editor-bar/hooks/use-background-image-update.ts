import type { EditorEngine } from '@/components/store/editor/engine';
import type { ImageContentData } from '@onlook/models';
import { imagePathToUrl } from '@onlook/utility';
import { debounce } from 'lodash';
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
    const [isApplyingImage, setIsApplyingImage] = useState(false);
    const [isApplyingPreview, setIsApplyingPreview] = useState(false);

    const currentBackgroundImage = useMemo(() => {
        const selectedStyle = editorEngine.style.selectedStyle?.styles.computed.backgroundImage;
        if (selectedStyle && selectedStyle !== 'none') {
            const urlMatch = /url\(['"]?([^'"]+)['"]?\)/.exec(selectedStyle);
            return urlMatch ? (urlMatch[1]) : null;
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
        async (imageData: ImageContentData, fillOptionValue: ImageFit, isPreview = false) => {
            try {
                if (isPreview) {
                    setIsApplyingPreview(true);
                } else {
                    setIsApplyingImage(true);
                }

                const selected = editorEngine.elements.selected;

                if (!selected || selected.length === 0) {
                    console.warn('No elements selected to apply background image');
                    return;
                }

                if (!imageData.originPath) {
                    console.warn('Image origin path is missing');
                    return;
                }
                
               
                 const url = imagePathToUrl(imageData.originPath);
                const cssStyles = FitToStyle[fillOptionValue];

                const styles = {
                    backgroundImage: `url('/${url}')`,
                    ...cssStyles,
                };

                editorEngine.style.updateMultiple(styles);
            } catch (error) {
                console.error('Failed to apply background image:', error);
            } finally {
                if (isPreview) {
                    setIsApplyingPreview(false);
                } else {
                    setIsApplyingImage(false);
                }
            }
        },
        [editorEngine],
    );

    const debouncedApplyPreview = useMemo(
        () => debounce((imageData: ImageContentData, fillOptionValue: ImageFit) => {
            void applyBackgroundImage(imageData, fillOptionValue, true);
        }, 150),
        [applyBackgroundImage],
    );

    useEffect(() => {
        return () => {
            debouncedApplyPreview.cancel();
        };
    }, [debouncedApplyPreview]);

    const handleFillOptionChange = useCallback(
        async (option: ImageFit) => {
            setFillOption(option);

            const selectedImage = editorEngine.image.selectedImage;
            if (selectedImage) {
                await applyBackgroundImage(selectedImage, option);
            }
        },
        [applyBackgroundImage, editorEngine.image.selectedImage],
    );

    const applySelectedImageAsBackground = useCallback(
        async (image: ImageContentData, isPreview = false) => {
            if (isPreview) {
                debouncedApplyPreview(image, fillOption);
            } else {
                await applyBackgroundImage(image, fillOption, false);
            }
        },
        [applyBackgroundImage, debouncedApplyPreview, fillOption],
    );

    const removeBackground = useCallback(async () => {
        try {
            setIsApplyingImage(true);

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
        } finally {
            setIsApplyingImage(false);
        }
    }, [editorEngine]);

    useEffect(() => {
        if (currentBackgroundSize) {
            setFillOption(currentBackgroundSize);
        }
    }, [currentBackgroundSize]);

    useEffect(() => {
        const previewImage = editorEngine.image.previewImage;
        const isSelectingImage = editorEngine.image.isSelectingImage;
        
        if (previewImage && isSelectingImage) {
            applySelectedImageAsBackground(previewImage, true);
        }
    }, [editorEngine.image.previewImage, editorEngine.image.isSelectingImage, applySelectedImageAsBackground]);

    useEffect(() => {
        const selectedImage = editorEngine.image.selectedImage;
        const isSelectingImage = editorEngine.image.isSelectingImage;
        
        if (selectedImage && isSelectingImage) {
            applySelectedImageAsBackground(selectedImage, false);
        }
    }, [editorEngine.image.selectedImage, editorEngine.image.isSelectingImage, applySelectedImageAsBackground]);


    useEffect(() => {
        return () => {
            debouncedApplyPreview.cancel();
            
            if (editorEngine.image.isSelectingImage) {
                editorEngine.image.setIsSelectingImage(false);
                editorEngine.image.setSelectedImage(null);
                editorEngine.image.setPreviewImage(null);
            }
        };
    }, [editorEngine, debouncedApplyPreview]);

    return {
        fillOption,
        currentBackgroundImage,
        currentBackgroundSize,
        isApplyingImage,
        isApplyingPreview,
        handleFillOptionChange,
        applySelectedImageAsBackground,
        removeBackground,
        ImageFit,
        IMAGE_FIT_OPTIONS,
    };
};
