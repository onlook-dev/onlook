import { describe, it, expect } from 'bun:test';
import { getURLSafeBase64Hash } from '../src/hash';

describe(getURLSafeBase64Hash.name, () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    it('works', async () => {
        const result = await getURLSafeBase64Hash(Buffer.from('hello world'));
        expect(result).toEqual('uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvzek');
    });
});
