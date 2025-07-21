import type { EditorEngine } from '@/components/store/editor/engine';
import { imagePathToUrl } from '@onlook/utility';
import type { ImageContentData } from '@onlook/models';
import { useCallback, useEffect, useMemo, useState } from 'react';


// Custom hook for background image functionality
export const useBackgroundImage = (editorEngine: EditorEngine) => {
    const [fillOption, setFillOption] = useState('Fill');

    // Get current background image from selected element
    const currentBackgroundImage = useMemo(() => {
        const selectedStyle = editorEngine.style.selectedStyle?.styles.computed.backgroundImage;
        if (selectedStyle && selectedStyle !== 'none') {
            // Extract URL from CSS url() function
            const urlMatch = /url\(['"]?([^'"]+)['"]?\)/.exec(selectedStyle);
            return urlMatch ? urlMatch[1] : null;
        }
        return null;
    }, [editorEngine.style.selectedStyle?.styles.computed.backgroundImage]);

    // Get current background size and map it to fill option
    const currentBackgroundSize = useMemo(() => {
        const selectedStyle = editorEngine.style.selectedStyle?.styles.computed.backgroundSize;
        const selectedRepeat = editorEngine.style.selectedStyle?.styles.computed.backgroundRepeat;

        if (!selectedStyle) return null;

        // Map CSS background-size values back to our fill options
        if (selectedStyle === 'cover') return 'Fill';
        if (selectedStyle === 'contain') return 'Fit';
        if (selectedStyle === '100% 100%') return 'Stretch';
        if (selectedStyle === 'auto' && selectedRepeat === 'repeat') return 'Tile';
        if (selectedStyle === 'auto') return 'Center';
        return 'Auto';
    }, [
        editorEngine.style.selectedStyle?.styles.computed.backgroundSize,
        editorEngine.style.selectedStyle?.styles.computed.backgroundRepeat,
    ]);

    // Apply background image to selected elements
    const applyBackgroundImage = useCallback(
        (imageData: ImageContentData, fillOptionValue: string) => {
            const selected = editorEngine.elements.selected;

            if (!selected || selected.length === 0) {
                console.warn('No elements selected to apply background image');
                return;
            }

            // Convert image path to URL
            const url = imagePathToUrl(imageData.originPath);

            // Map fill options to CSS background-size values
            const fillToCssMap: Record<string, string> = {
                Fill: 'cover', // Fill entire container, may crop
                Fit: 'contain', // Fit entire image, may have empty space
                Stretch: '100% 100%', // Stretch to fill, may distort
                Center: 'auto', // Original size, centered
                Tile: 'auto', // Original size, repeated
                Auto: 'auto', // Browser default
            };

            const backgroundSize = fillToCssMap[fillOptionValue] ?? 'cover';
            const backgroundRepeat = fillOptionValue === 'Tile' ? 'repeat' : 'no-repeat';
            const backgroundPosition = 'center';

            // Apply styles using the style manager
            const styles = {
                backgroundImage: `url('/${url}')`,
                backgroundSize: backgroundSize,
                backgroundRepeat: backgroundRepeat,
                backgroundPosition: backgroundPosition,
            };

            editorEngine.style.updateMultiple(styles);
        },
        [editorEngine],
    );

    const handleFillOptionChange = useCallback(
        (option: string) => {
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
    };
};
