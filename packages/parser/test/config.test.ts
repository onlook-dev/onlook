import { DEPRECATED_PRELOAD_SCRIPT_SRC, PRELOAD_SCRIPT_SRC } from '@onlook/constants';
import { describe, expect, test } from 'bun:test';
import { getAstFromContent, getContentFromAst, injectPreloadScript } from 'src';

const baseImport = 'import React from "react";\n';

// Regex to match import Script from either single or double quotes
const importScriptRegex = /import Script from ['"]next\/script['"];?/g;

describe('addScriptConfig', () => {
    test('adds Script import and Script in <head> if missing', async () => {
        const code = `${baseImport}export default function Document() {\n  return (\n    <html>\n      <head>\n        <title>Test</title>\n      </head>\n      <body>\n        <main />\n      </body>\n    </html>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        expect(result).toMatch(importScriptRegex);
        expect(result).toContain(PRELOAD_SCRIPT_SRC);
        // Should only be one Script import
        expect(result.match(importScriptRegex)?.length).toBe(1);
        // Should only be one Script tag in head
        expect(result.match(new RegExp(PRELOAD_SCRIPT_SRC, 'g'))?.length).toBe(1);
    });

    test('does not duplicate Script if already present', async () => {
        const code = `${baseImport}import Script from 'next/script';\nexport default function Document() {\n  return (\n    <html>\n      <head>\n        <title>Test</title>\n        <Script type="module" src="${PRELOAD_SCRIPT_SRC}" />\n      </head>\n      <body>\n        <main />\n      </body>\n    </html>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        // Should not add another import
        expect(result.match(importScriptRegex)?.length).toBe(1);
        // Should not add another Script tag
        expect(result.match(new RegExp(PRELOAD_SCRIPT_SRC, 'g'))?.length).toBe(1);
    });

    test('creates <head> with Script if only <html> exists', async () => {
        const code = `${baseImport}export default function Document() {\n  return (\n    <html>\n      <body>\n        <main />\n      </body>\n    </html>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        expect(result).toContain('<head>');
        expect(result).toContain(PRELOAD_SCRIPT_SRC);
    });

    test('handles self-closing <head /> tag', async () => {
        const code = `${baseImport}export default function Document() {\n  return (\n    <html>\n      <head />\n      <body>\n        <main />\n      </body>\n    </html>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        expect(result).toMatch(importScriptRegex);
        expect(result).toContain(PRELOAD_SCRIPT_SRC);
        // Should only be one Script import
        expect(result.match(importScriptRegex)?.length).toBe(1);
        // Should only be one Script tag in head
        expect(result.match(new RegExp(PRELOAD_SCRIPT_SRC, 'g'))?.length).toBe(1);
        // should not contain self-closing head
        expect(result).not.toContain('<head />');
    });

    test('removes deprecated script and adds new one', async () => {
        const deprecatedSrc = `https://some-url/onlook-dev/web/script.js`;
        const code = `${baseImport}import Script from 'next/script';
export default function Document() {
  return (
    <html>
      <head>
        <title>Test</title>
        <Script type="module" src="${deprecatedSrc}" />
      </head>
      <body>
        <main />
      </body>
    </html>
  );
}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        expect(result).not.toContain(DEPRECATED_PRELOAD_SCRIPT_SRC);
        expect(result).toContain(PRELOAD_SCRIPT_SRC);
        expect(result.match(importScriptRegex)?.length).toBe(1);
        expect(result.match(new RegExp(PRELOAD_SCRIPT_SRC, 'g'))?.length).toBe(1);
    });

    test('removes deprecated script', async () => {
        const code = `${baseImport}import Script from 'next/script';
export default function Document() {
  return (
    <html lang="en" suppressHydrationWarning data-oid="o7v_4be">
      <head data-oid="795jc-7">
        <Script
          type="module"
          src="https://cdn.jsdelivr.net/gh/onlook-dev/onlook@main/apps/web/preload/dist/index.js"
          data-oid="m4pfglr"
        />

        <Script
          type="module"
          src="https://cdn.jsdelivr.net/gh/onlook-dev/web@latest/apps/web/preload/dist/index.js"
          data-oid="yujojk-"
        />
      </head>
      <body
        className={'h-screen antialiased'}
        data-oid="lb.txaa"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          data-oid="3tbrd3_"
        >
          <Navbar data-oid="ctrg0y3" />
          <main className="" data-oid="j990_9w">
            {children}
          </main>
          <Footer data-oid="j7nr0na" />
        </ThemeProvider>
      </body>
    </html>
  );
}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        expect(result).not.toContain(DEPRECATED_PRELOAD_SCRIPT_SRC);
        expect(result).toContain(PRELOAD_SCRIPT_SRC);
        expect(result.match(importScriptRegex)?.length).toBe(1);
        expect(result.match(new RegExp(PRELOAD_SCRIPT_SRC, 'g'))?.length).toBe(1);
    });
});
