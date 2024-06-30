import { TemplateNode } from '@/lib/models';
import { compressSync, decompressSync, strFromU8, strToU8 } from 'fflate';

export function compress(templateNode: TemplateNode) {
    const buffer = strToU8(JSON.stringify(templateNode));
    const compressed = compressSync(buffer);
    const binaryString = Array.from(new Uint8Array(compressed)).map(byte => String.fromCharCode(byte)).join('');
    const base64 = btoa(binaryString);
    return base64;
}

export function decompress(base64: string): TemplateNode {
    const buffer = new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
    const decompressed = decompressSync(buffer);
    const JsonString = strFromU8(decompressed);
    const templateNode = JSON.parse(JsonString) as TemplateNode;
    return templateNode
}