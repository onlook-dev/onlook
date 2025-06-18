import { describe, expect, test } from 'bun:test';
import { addScriptConfig, getAstFromContent, getContentFromAst } from 'src';

const SCRIPT_TAG =
    '<Script type="module" src="https://cdn.jsdelivr.net/gh/onlook-dev/web@latest/apps/web/preload/dist/index.js" />';

const baseImport = 'import React from "react";\n';

// Regex to match import Script from either single or double quotes
const importScriptRegex = /import Script from ['"]next\/script['"];?/g;

describe('addScriptConfig', () => {
    test('adds Script import and Script in <head> if missing', async () => {
        const code = `${baseImport}export default function Document() {\n  return (\n    <html>\n      <head>\n        <title>Test</title>\n      </head>\n      <body>\n        <main />\n      </body>\n    </html>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = addScriptConfig(ast);
        const result = await getContentFromAst(resultAst);
        expect(result).toMatch(importScriptRegex);
        expect(result).toContain(SCRIPT_TAG);
        // Should only be one Script import
        expect(result.match(importScriptRegex)?.length).toBe(1);
        // Should only be one Script tag in head
        expect(result.match(new RegExp(SCRIPT_TAG, 'g'))?.length).toBe(1);
    });

    test('does not duplicate Script if already present', async () => {
        const code = `${baseImport}import Script from 'next/script';\nexport default function Document() {\n  return (\n    <html>\n      <head>\n        <title>Test</title>\n        ${SCRIPT_TAG}\n      </head>\n      <body>\n        <main />\n      </body>\n    </html>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = addScriptConfig(ast);
        const result = await getContentFromAst(resultAst);
        // Should not add another import
        expect(result.match(importScriptRegex)?.length).toBe(1);
        // Should not add another Script tag
        expect(result.match(new RegExp(SCRIPT_TAG, 'g'))?.length).toBe(1);
    });

    test('creates <head> with Script if only <html> exists', async () => {
        const code = `${baseImport}export default function Document() {\n  return (\n    <html>\n      <body>\n        <main />\n      </body>\n    </html>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = addScriptConfig(ast);
        const result = await getContentFromAst(resultAst);
        expect(result).toContain('<head>');
        expect(result).toContain(SCRIPT_TAG);
    });
});
