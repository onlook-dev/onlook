import { test } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

test('dom test', async () => {
    const filePath = resolve(__dirname, 'code.tsx');
    const code = readFileSync(filePath, 'utf8');
});
