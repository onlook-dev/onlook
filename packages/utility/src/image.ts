import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<string | undefined> {
    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
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
