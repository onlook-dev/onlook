import {
    DEPRECATED_PRELOAD_SCRIPT_SRC,
    PRELOAD_SCRIPT_FILE_NAME,
    PRELOAD_SCRIPT_SRC,
} from '@onlook/constants';
import { describe, expect, test } from 'bun:test';
import { getAstFromContent, getContentFromAst, injectPreloadScript } from 'src';

const baseImport = 'import React from "react";\n';

// Regex to match import Script from either single or double quotes
const importScriptRegex = /import Script from ['"]next\/script['"];?/g;

describe('addScriptConfig', () => {
    test('adds Script import and Script in <body> if missing', async () => {
        const code = `${baseImport}export default function Document() {\n  return (\n    <html>\n      <head>\n        <title>Test</title>\n      </head>\n      <body>\n        <main />\n      </body>\n    </html>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        expect(result).toMatch(importScriptRegex);
        expect(result).toContain(PRELOAD_SCRIPT_FILE_NAME);
        // Should only be one Script import
        expect(result.match(importScriptRegex)?.length).toBe(1);
        // Should only be one Script tag in body
        expect(result.match(new RegExp(`src="${PRELOAD_SCRIPT_FILE_NAME}"`))?.length).toBe(1);
        expect(result.match(new RegExp(`id="${PRELOAD_SCRIPT_FILE_NAME}"`))?.length).toBe(1);
    });

    test('does not duplicate Script if already present', async () => {
        const code = `${baseImport}import Script from 'next/script';\nexport default function Document() {\n  return (\n    <html>\n      <head>\n        <title>Test</title>\n        <Script type="module" src="${PRELOAD_SCRIPT_SRC}" />\n      </head>\n      <body>\n        <main />\n      <Script type="module" src="${PRELOAD_SCRIPT_FILE_NAME}" id="${PRELOAD_SCRIPT_FILE_NAME}" strategy="beforeInteractive" />\n </body>\n    </html>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        // Should not add another import
        expect(result.match(importScriptRegex)?.length).toBe(1);
        // Should not add another Script tag
        expect(result.match(new RegExp(`src="${PRELOAD_SCRIPT_FILE_NAME}"`))?.length).toBe(1);
    });

    test('creates <body> with Script if only <html> exists', async () => {
        const code = `${baseImport}export default function Document() {\n  return (\n    <html>\n  </html>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        expect(result).toContain('<body>');
        expect(result).toContain(PRELOAD_SCRIPT_FILE_NAME);
    });

    test('handles self-closing <body /> tag', async () => {
        const code = `${baseImport}export default function Document() {\n  return (\n    <html>\n      <body />\n    </html>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        expect(result).toMatch(importScriptRegex);
        expect(result).toContain(PRELOAD_SCRIPT_FILE_NAME);
        // Should only be one Script import
        expect(result.match(importScriptRegex)?.length).toBe(1);
        // Should only be one Script tag in body
        expect(result.match(new RegExp(`src="${PRELOAD_SCRIPT_FILE_NAME}"`))?.length).toBe(1);
        // should not contain self-closing body
        expect(result).not.toContain('<body />');
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
        expect(result).toContain(PRELOAD_SCRIPT_FILE_NAME);
        expect(result.match(importScriptRegex)?.length).toBe(1);
        expect(result.match(new RegExp(`src="${PRELOAD_SCRIPT_FILE_NAME}"`))?.length).toBe(1);
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
        expect(result).toContain(PRELOAD_SCRIPT_FILE_NAME);
        expect(result.match(importScriptRegex)?.length).toBe(1);
        expect(result.match(new RegExp(`src="${PRELOAD_SCRIPT_FILE_NAME}"`))?.length).toBe(1);
    });

    test('wraps fragment-only return with html/body and injects Script', async () => {
        const code = `${baseImport}export default function Layout() {\n  return (\n    <>\n      <div>Header</div>\n      <main />\n    </>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        expect(result).toContain('<html');
        expect(result).toContain('<body');
        expect(result).toContain(PRELOAD_SCRIPT_FILE_NAME);
    });

    test('wraps plain children return with html/body and injects Script', async () => {
        const code = `${baseImport}export default function Layout({ children }) {\n  return children;\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        expect(result).toContain('<html');
        expect(result).toContain('<body');
        expect(result).toContain(PRELOAD_SCRIPT_FILE_NAME);
    });

    test('injects Script in first <body> only if multiple exist', async () => {
        const code = `${baseImport}export default function Layout() {\n  return (\n    <>\n      <body />\n      <body><main /></body>\n    </>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        expect(result.match(new RegExp(`src="${PRELOAD_SCRIPT_FILE_NAME}"`, 'g'))?.length).toBe(1);
        expect(result).not.toContain('<body />');
    });

    test('preserves body props when adding Script', async () => {
        const code = `${baseImport}export default function Layout() {\n  return (\n    <html>\n      <body className="custom">\n        <main />\n      </body>\n    </html>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        expect(result).toContain('className="custom"');
        expect(result).toContain(PRELOAD_SCRIPT_FILE_NAME);
    });

    test('injects Script when only <head> has existing Script', async () => {
        const code = `${baseImport}import Script from 'next/script';\nexport default function Layout() {\n  return (\n    <html>\n      <head>\n        <Script src="https://example.com/other.js" />\n      </head>\n      <body>\n        <main />\n      </body>\n    </html>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        expect(result.match(importScriptRegex)?.length).toBe(1);
        expect(result.match(new RegExp(`src="${PRELOAD_SCRIPT_FILE_NAME}"`))?.length).toBe(1);
    });

    test('handles self-closing html and head tags', async () => {
        const code = `${baseImport}export default function Layout() {\n  return (\n    <html />\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        expect(result).toContain('<html');
        expect(result).toContain('<body');
        expect(result).toContain(PRELOAD_SCRIPT_FILE_NAME);
    });

    test('wraps conditional ternary returns with no html/body (skipped)', async () => {
        const code = `${baseImport}export default function Layout() {\n  return true ? <div /> : <span />;\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        // We may choose to skip ternaries for now
        expect(result).toContain('<html');
        expect(result).toContain(PRELOAD_SCRIPT_FILE_NAME);
        expect(result).toContain('{true ?');
    });

    test('injects Script at bottom of body preserving sibling order', async () => {
        const code = `${baseImport}export default function Layout() {\n  return (\n    <html>\n      <body>\n        <main />\n        <footer />\n      </body>\n    </html>\n  );\n}`;
        const ast = getAstFromContent(code);
        if (!ast) throw new Error('Failed to parse input code');
        const resultAst = injectPreloadScript(ast);
        const result = await getContentFromAst(resultAst);
        const scriptIndex = result.indexOf(PRELOAD_SCRIPT_FILE_NAME);
        const footerIndex = result.indexOf('<footer');
        expect(scriptIndex).toBeGreaterThan(footerIndex);
    });
});
