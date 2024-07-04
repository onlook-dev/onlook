import { compressSync, decompressSync, strFromU8, strToU8 } from 'fflate';

export function compress(json: Object) {
    // Compress JSON to base64
    const buf = strToU8(JSON.stringify(json));
    const compressed = compressSync(buf);
    const base64 = Buffer.from(compressed).toString('base64');
    return base64;
}

export function decompress(base64: string) {
    // Decompress base64 to JSON
    const buffer = new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
    const decompressed = decompressSync(buffer);
    const str = strFromU8(decompressed);
    return JSON.parse(str);
}