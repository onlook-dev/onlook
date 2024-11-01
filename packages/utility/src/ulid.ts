// @ts-ignore
import anyBase from 'any-base';
import { crypto } from './crypto';

const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const decimalToBase58: (dec: string) => string = anyBase(anyBase.DEC, base58);

export function ulid(): string {
    // ULID (https://github.com/ulid/spec) encoded in base58

    const ms = BigInt(Date.now());

    const data = new Uint8Array(16);
    const dataBytes = new DataView(data.buffer);

    dataBytes.setUint32(0, Number(ms >> 16n));
    dataBytes.setUint16(4, Number(ms & 0xffffn));

    crypto.getRandomValues(new Uint8Array(data.buffer, 6, 10));

    const value = (dataBytes.getBigUint64(0) << 64n) + dataBytes.getBigUint64(8);

    const ret = decimalToBase58(value.toString()).padStart(22, base58[0]);
    return ret;
}
