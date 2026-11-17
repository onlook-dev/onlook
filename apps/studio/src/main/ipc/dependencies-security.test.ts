import { expect, test } from 'bun:test';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const app = createRequire(join(import.meta.dirname, '../../../package.json'));
const mcp = createRequire(app.resolve('@modelcontextprotocol/sdk/server/mcp.js'));
const express = createRequire(mcp.resolve('express'));
const ajv = createRequire(mcp.resolve('ajv'));
const limiter = createRequire(mcp.resolve('express-rate-limit'));

function installedVersion(resolve: NodeJS.Require, name: string): string {
  let directory = dirname(resolve.resolve(name));
  for (;;) {
    const manifest = join(directory, 'package.json');
    if (existsSync(manifest)) {
      const value = JSON.parse(readFileSync(manifest, 'utf8'));
      if (value.name === name) return value.version;
    }
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`Missing manifest for ${name}`);
    directory = parent;
  }
}

for (const [name, minimum, resolve] of [
  ['body-parser', '2.4.0', express],
  ['fast-uri', '3.1.9', ajv],
  ['ip-address', '10.7.4', limiter],
  ['qs', '6.16.1', express],
  ['zod', '4.6.6', mcp],
] as const) {
  test(`publication runtime dependency ${name} resolves past its advisory floor`, () => {
    const version = installedVersion(resolve, name).split('.').map(Number);
    const floor = minimum.split('.').map(Number);
    expect(version[0]).toBe(floor[0]);
    expect(version[1]! * 10000 + version[2]!).toBeGreaterThanOrEqual(floor[1]! * 10000 + floor[2]!);
  });
}

test('publication runtime query serialization handles non-callable toString values', () => {
  const qs = express('qs');
  expect(() => qs.stringify({ values: [{ toString: 'not callable' }] }, { arrayFormat: 'comma' })).not.toThrow();
});
