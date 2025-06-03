export async function captureScreenshot(): Promise<{
    mimeType: string;
    data: string;
}> {
    try {
        // Use viewport dimensions to reduce size
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Create a canvas with viewport dimensions
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get canvas context');
        }

        // Set canvas dimensions to viewport size
        canvas.width = viewportWidth;
        canvas.height = viewportHeight;

        // Try modern getDisplayMedia API first (if available in this context)
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: viewportWidth,
                        height: viewportHeight
                    } as MediaTrackConstraints
                });

                const video = document.createElement('video');
                video.srcObject = stream;
                video.autoplay = true;
                video.muted = true;

                await new Promise<void>((resolve) => {
                    video.onloadedmetadata = () => {
                        video.play();
                        video.oncanplay = () => {
                            context.drawImage(video, 0, 0, viewportWidth, viewportHeight);
                            stream.getTracks().forEach(track => track.stop());
                            resolve();
                        };
                    };
                });

                // Convert canvas to base64 string with compression
                const base64 = await compressImage(canvas);
                console.log(`Screenshot captured - Size: ~${Math.round((base64.length * 0.75) / 1024)} KB`);
                return {
                    mimeType: 'image/jpeg',
                    data: base64,
                };
            } catch (displayError) {
                console.log('getDisplayMedia failed, falling back to DOM rendering:', displayError);
            }
        }

        // Fallback: DOM-to-canvas rendering
        await renderDomToCanvas(context, viewportWidth, viewportHeight);

        // Convert canvas to base64 string with compression
        const base64 = await compressImage(canvas);
        console.log(`DOM screenshot captured - Size: ~${Math.round((base64.length * 0.75) / 1024)} KB`);
        return {
            mimeType: 'image/jpeg',
            data: base64,
        };
    } catch (error) {
        console.error('Failed to capture screenshot:', error);

        // Ultimate fallback: create a minimal screenshot
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
            canvas.width = 400;
            canvas.height = 300;

            // White background
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, 400, 300);

            // Error message
            context.fillStyle = '#ff0000';
            context.font = '14px Arial, sans-serif';
            context.textAlign = 'center';
            context.fillText('Screenshot unavailable', 200, 150);

            return {
                mimeType: 'image/jpeg',
                data: canvas.toDataURL('image/jpeg', 0.8),
            };
        }

        throw error;
    }
}

async function compressImage(canvas: HTMLCanvasElement): Promise<string> {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes (base64 is ~1.33x larger)
    const MAX_BASE64_SIZE = MAX_FILE_SIZE * 0.75; // Approximate base64 size limit

    // Try different quality levels and scaling factors
    const qualityLevels = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
    const scalingFactors = [1, 0.8, 0.6, 0.5, 0.4, 0.3];

    for (const scale of scalingFactors) {
        let scaledCanvas = canvas;

        // Create scaled canvas if needed
        if (scale < 1) {
            scaledCanvas = document.createElement('canvas');
            const scaledContext = scaledCanvas.getContext('2d');
            if (!scaledContext) continue;

            scaledCanvas.width = canvas.width * scale;
            scaledCanvas.height = canvas.height * scale;
            scaledContext.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        }

        // Try different quality levels for this scale
        for (const quality of qualityLevels) {
            const base64 = scaledCanvas.toDataURL('image/jpeg', quality);

            // Check if the size is acceptable
            if (base64.length <= MAX_BASE64_SIZE) {
                return base64;
            }
        }
    }

    // Fallback: very low quality and small size
    const fallbackCanvas = document.createElement('canvas');
    const fallbackContext = fallbackCanvas.getContext('2d');
    if (fallbackContext) {
        fallbackCanvas.width = canvas.width * 0.2;
        fallbackCanvas.height = canvas.height * 0.2;
        fallbackContext.drawImage(canvas, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
        return fallbackCanvas.toDataURL('image/jpeg', 0.2);
    }

    // Ultimate fallback
    return canvas.toDataURL('image/jpeg', 0.1);
}

async function renderDomToCanvas(context: CanvasRenderingContext2D, width: number, height: number) {
    // Set white background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    // Get all visible elements in the viewport
    const elements = document.querySelectorAll('*');
    const visibleElements: { element: HTMLElement; rect: DOMRect; styles: CSSStyleDeclaration }[] = [];

    // Filter and collect visible elements with their computed styles
    for (const element of elements) {
        if (element instanceof HTMLElement) {
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);

            // Check if element is visible and within viewport
            if (
                rect.width > 0 &&
                rect.height > 0 &&
                rect.left < width &&
                rect.top < height &&
                rect.right > 0 &&
                rect.bottom > 0 &&
                styles.visibility !== 'hidden' &&
                styles.display !== 'none' &&
                parseFloat(styles.opacity) > 0
            ) {
                visibleElements.push({ element, rect, styles });
            }
        }
    }

    // Sort elements by z-index and document order
    visibleElements.sort((a, b) => {
        const aZIndex = parseInt(a.styles.zIndex) || 0;
        const bZIndex = parseInt(b.styles.zIndex) || 0;
        return aZIndex - bZIndex;
    });

    // Render each visible element
    for (const { element, rect, styles } of visibleElements) {
        try {
            await renderElement(context, element, rect, styles);
        } catch (error) {
            console.warn('Failed to render element:', element, error);
        }
    }
}

async function renderElement(
    context: CanvasRenderingContext2D,
    element: HTMLElement,
    rect: DOMRect,
    styles: CSSStyleDeclaration
) {
    const { left, top, width, height } = rect;

    // Skip if element is too small or outside bounds
    if (width < 1 || height < 1 || left > window.innerWidth || top > window.innerHeight) {
        return;
    }

    // Render background
    const backgroundColor = styles.backgroundColor;
    if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
        context.fillStyle = backgroundColor;
        context.fillRect(left, top, width, height);
    }

    // Render border
    const borderWidth = parseFloat(styles.borderWidth) || 0;
    const borderColor = styles.borderColor;
    if (borderWidth > 0 && borderColor && borderColor !== 'transparent') {
        context.strokeStyle = borderColor;
        context.lineWidth = borderWidth;
        context.strokeRect(left, top, width, height);
    }

    // Render text content
    if (element.textContent && element.children.length === 0) {
        const text = element.textContent.trim();
        if (text) {
            const fontSize = parseFloat(styles.fontSize) || 16;
            const fontFamily = styles.fontFamily || 'Arial, sans-serif';
            const color = styles.color || '#000000';

            context.fillStyle = color;
            context.font = `${fontSize}px ${fontFamily}`;
            context.textAlign = 'left';
            context.textBaseline = 'top';

            // Simple text wrapping
            const words = text.split(' ');
            let line = '';
            let y = top + 2;
            const lineHeight = fontSize * 1.2;

            for (const word of words) {
                const testLine = line + word + ' ';
                const metrics = context.measureText(testLine);
                if (metrics.width > width - 4 && line !== '') {
                    context.fillText(line, left + 2, y);
                    line = word + ' ';
                    y += lineHeight;
                    if (y > top + height) break;
                } else {
                    line = testLine;
                }
            }
            if (line && y <= top + height) {
                context.fillText(line, left + 2, y);
            }
        }
    }

    // Render images
    if (element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0) {
        try {
            context.drawImage(element, left, top, width, height);
        } catch (error) {
            // Image may have CORS issues, render a placeholder instead
            context.fillStyle = '#f0f0f0';
            context.fillRect(left, top, width, height);
            context.fillStyle = '#999999';
            context.font = '12px Arial, sans-serif';
            context.textAlign = 'center';
            context.fillText('Image', left + width / 2, top + height / 2);
        }
    }
}