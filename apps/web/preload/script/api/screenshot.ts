// Constants
const FALLBACK_CANVAS_WIDTH = 400;
const FALLBACK_CANVAS_HEIGHT = 300;
const TEXT_PADDING = 2;
const LINE_HEIGHT_MULTIPLIER = 1.2;
const TEXT_WRAP_MARGIN = 4;
const FALLBACK_SCALE_FACTOR = 0.2;
const FALLBACK_QUALITY = 0.2;
const FINAL_FALLBACK_QUALITY = 0.1;
export async function captureScreenshot(): Promise<{
    mimeType: string;
    data: string;
}> {
    return captureScreenshotImpl();
}

async function captureScreenshotImpl(): Promise<{
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

        // Warm up canvas context for font rendering
        context.fillText('', 0, 0);

        // Render DOM elements to canvas
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

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
            canvas.width = FALLBACK_CANVAS_WIDTH;
            canvas.height = FALLBACK_CANVAS_HEIGHT;

            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, FALLBACK_CANVAS_WIDTH, FALLBACK_CANVAS_HEIGHT);

            context.fillStyle = '#ff0000';
            context.font = '14px Arial, sans-serif';
            context.textAlign = 'center';
            context.fillText('Screenshot unavailable', FALLBACK_CANVAS_WIDTH / 2, FALLBACK_CANVAS_HEIGHT / 2);

            return {
                mimeType: 'image/jpeg',
                data: canvas.toDataURL('image/jpeg', 0.8),
            };
        }

        throw error;
    }
}

async function compressImage(canvas: HTMLCanvasElement): Promise<string> {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
    const MAX_BASE64_SIZE = MAX_FILE_SIZE * 0.75;

    const qualityLevels = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
    const scalingFactors = [1, 0.8, 0.6, 0.5, 0.4, 0.3];

    for (const scale of scalingFactors) {
        let scaledCanvas = canvas;

        if (scale < 1) {
            scaledCanvas = document.createElement('canvas');
            const scaledContext = scaledCanvas.getContext('2d');
            if (!scaledContext) continue;

            scaledCanvas.width = canvas.width * scale;
            scaledCanvas.height = canvas.height * scale;
            scaledContext.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        }

        for (const quality of qualityLevels) {
            const base64 = scaledCanvas.toDataURL('image/jpeg', quality);

            if (base64.length <= MAX_BASE64_SIZE) {
                return base64;
            }
        }
    }

    const fallbackCanvas = document.createElement('canvas');
    const fallbackContext = fallbackCanvas.getContext('2d');
    if (fallbackContext) {
        fallbackCanvas.width = canvas.width * FALLBACK_SCALE_FACTOR;
        fallbackCanvas.height = canvas.height * FALLBACK_SCALE_FACTOR;
        fallbackContext.drawImage(canvas, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
        return fallbackCanvas.toDataURL('image/jpeg', FALLBACK_QUALITY);
    }

    return canvas.toDataURL('image/jpeg', FINAL_FALLBACK_QUALITY);
}

async function renderDomToCanvas(context: CanvasRenderingContext2D, width: number, height: number) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    const elements = document.querySelectorAll('*');
    const visibleElements: { element: HTMLElement; rect: DOMRect; styles: CSSStyleDeclaration }[] = [];

    for (const element of elements) {
        if (element instanceof HTMLElement) {
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);

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

    visibleElements.sort((a, b) => {
        const aZIndex = parseInt(a.styles.zIndex) || 0;
        const bZIndex = parseInt(b.styles.zIndex) || 0;
        return aZIndex - bZIndex;
    });

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

    if (width < 1 || height < 1 || left > window.innerWidth || top > window.innerHeight) {
        return;
    }

    const backgroundColor = styles.backgroundColor;
    if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
        context.fillStyle = backgroundColor;
        context.fillRect(left, top, width, height);
    }

    const borderWidth = parseFloat(styles.borderWidth) || 0;
    const borderColor = styles.borderColor;
    if (borderWidth > 0 && borderColor && borderColor !== 'transparent') {
        context.strokeStyle = borderColor;
        context.lineWidth = borderWidth;
        context.strokeRect(left, top, width, height);
    }

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

            const words = text.split(' ');
            let line = '';
            let y = top + TEXT_PADDING;
            const lineHeight = fontSize * LINE_HEIGHT_MULTIPLIER;

            for (const word of words) {
                const testLine = line + word + ' ';
                const metrics = context.measureText(testLine);
                if (metrics.width > width - TEXT_WRAP_MARGIN && line !== '') {
                    context.fillText(line, left + TEXT_PADDING, y);
                    line = word + ' ';
                    y += lineHeight;
                    if (y > top + height) break;
                } else {
                    line = testLine;
                }
            }
            if (line && y <= top + height) {
                context.fillText(line, left + TEXT_PADDING, y);
            }
        }
    }

    if (element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0) {
        try {
            context.drawImage(element, left, top, width, height);
        } catch (error) {
            context.fillStyle = '#f0f0f0';
            context.fillRect(left, top, width, height);
            context.fillStyle = '#999999';
            context.font = '12px Arial, sans-serif';
            context.textAlign = 'center';
            context.fillText('Image', left + width / 2, top + height / 2);
        }
    }
}