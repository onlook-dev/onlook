import imageCompression from 'browser-image-compression';

// Browser-side image compression
export async function compressImageInBrowser(file: File): Promise<string | undefined> {
    const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 2048,
    };

    try {
        const compressedFile = await imageCompression(file, options);
        const base64URL = imageCompression.getDataUrlFromFile(compressedFile);
        console.log(`Image size reduced from ${file.size} to ${compressedFile.size} (bytes)`);
        return base64URL;
    } catch (error) {
        console.error('Error compressing image:', error);
    }
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteString = atob(base64.split(',')[1] ?? '');
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
}

export function addBase64Prefix(mimeType: string, base64: string): string {
    if (base64.startsWith('data:')) {
        // If the base64 already has a prefix, return it
        return base64;
    }
    return `data:${mimeType};base64,${base64}`;
}

/**
 * Converts a CSS background-image URL from full URL to relative path
 * Example: url("https://xxx-3000.csb.app/images/a.jpg") -> url("/images/c.jpg")
 */
export function urlToRelativePath(url: string): string {
    const urlMatch = url.match(/url\s*\(\s*["']?([^"')]+)["']?\s*\)/);

    // If it's not a url() function or no URL found, return as is
    if (!urlMatch || !urlMatch[1]) {
        return url;
    }

    const fullUrl = urlMatch[1];

    // Extract the pathname (e.g., "/images/c.jpg")
    try {
        const newUrl = new URL(fullUrl);
        return `url('${newUrl.pathname}')`;
    } catch (error) {
        return url;
    }
}

export function canHaveBackgroundImage(tagName: string): boolean {
    const tag = tagName.toLowerCase();
    const backgroundElements = ['div', 'section', 'header', 'footer', 'main', 'article', 'aside'];
    return backgroundElements.includes(tag);
}
