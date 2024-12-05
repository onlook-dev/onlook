import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'fs';
import path from 'path';
import { findAndReplace } from '../src/patch';

describe('Patch Code', () => {
    it('patch code', () => {
        // Use current path of this file
        const __dirname = path.dirname(new URL(import.meta.url).pathname);
        const original = readFileSync(`${__dirname}/data/patch/before.txt`, 'utf8');
        const after = readFileSync(`${__dirname}/data/patch/after.txt`, 'utf8');

        // Read output into blocks
        const output = readFileSync(`${__dirname}/data/patch/output.json`, 'utf8');
        const response = JSON.parse(output);
        const block = response.blocks[1];

        // Patch the code
        const result = findAndReplace(original, block.original, block.updated);
        expect(result).toEqual(after);
    });
});
