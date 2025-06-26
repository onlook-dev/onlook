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
