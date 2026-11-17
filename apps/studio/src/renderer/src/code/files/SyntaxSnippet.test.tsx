import { describe, expect, it } from 'bun:test';
import { renderToReadableStream } from 'react-dom/server';
import { codeLanguage } from '../codeLanguage.js';
import SyntaxSnippet, { matchedSyntax, syntaxTokens } from './SyntaxSnippet.js';

describe('syntax in search excerpts', () => {
  it('keeps source bytes and highlights TypeScript keywords, strings and numbers', async () => {
    const text = '  const label: string = "test"; const count = 42;';
    const tokens = syntaxTokens(await codeLanguage('src/Label.ts'), text);
    expect(tokens.map((token) => token.text).join('')).toBe(text);
    expect(tokens.find((token) => token.text === 'const')?.classes).toContain('tok-keyword');
    expect(tokens.find((token) => token.text === '"test"')?.classes).toContain('tok-string');
    expect(tokens.find((token) => token.text === '42')?.classes).toContain('tok-number');
  });

  it('marks a case-insensitive query even when it spans syntax tokens', async () => {
    const text = 'const Label = "test"';
    const parts = matchedSyntax(syntaxTokens(await codeLanguage('src/Label.ts'), text), 'CONST LABEL');
    expect(parts.map((part) => part.text).join('')).toBe(text);
    expect(parts.filter((part) => part.isMatch).map((part) => part.text).join('')).toBe('const Label');
  });

  it('renders matches separately from syntax and escapes source markup', async () => {
    const markup = await new Response(await renderToReadableStream(<SyntaxSnippet path="src/Card.tsx" text={'const view = <Card title="test" />;'} query="test" />)).text();
    expect(markup).toContain('tok-keyword');
    expect(markup).toContain('data-testid="code-files-match"');
    expect(markup).toContain('&lt;');
    expect(markup).not.toContain('<Card');
  });

  it('leaves unsupported logs readable and marks their matches without invented syntax', async () => {
    const text = 'A test log entry';
    expect(syntaxTokens(await codeLanguage('app.log'), text)).toEqual([{ text, classes: '' }]);
    expect(matchedSyntax(syntaxTokens(await codeLanguage('app.log'), text), 'test').filter((part) => part.isMatch).map((part) => part.text).join('')).toBe('test');
  });

  it('highlights Markdown structure while preserving source and query matches', async () => {
    const text = '# Setup\nUse **bold**, *emphasis*, `bun test`, [docs](https://example.com) and ~~old~~.';
    const tokens = syntaxTokens(await codeLanguage('README.MD'), text);
    expect(tokens.map((token) => token.text).join('')).toBe(text);
    for (const kind of ['heading', 'strong', 'emphasis', 'monospace', 'link', 'url', 'strikethrough', 'meta']) {
      expect(tokens.some((token) => token.classes.includes(`tok-${kind}`))).toBe(true);
    }
    expect(matchedSyntax(tokens, 'BUN TEST').filter((part) => part.isMatch).map((part) => part.text).join('')).toBe('bun test');
  });

  it('uses source syntax inside supported fences and leaves unknown fences plain', async () => {
    const text = '```typescript title="sample"\nconst count = 42;\n```\n\n```unknown\nconst count = 42;\n```';
    await codeLanguage('sample.ts');
    const tokens = syntaxTokens(await codeLanguage('GUIDE.markdown'), text);
    expect(tokens.map((token) => token.text).join('')).toBe(text);
    expect(tokens.filter((token) => token.classes.includes('tok-keyword')).map((token) => token.text)).toEqual(['const']);
    expect(tokens.filter((token) => token.classes.includes('tok-number')).map((token) => token.text)).toEqual(['42']);
  });
});
