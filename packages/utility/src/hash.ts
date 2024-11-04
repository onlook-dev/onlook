import { crypto } from './crypto';
import { Buffer } from 'buffer';

export async function getURLSafeBase64Hash(data: BufferSource): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', data);
    const base64 = Buffer.from(hash).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
