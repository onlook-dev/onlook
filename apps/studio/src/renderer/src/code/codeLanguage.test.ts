import { describe, expect, it } from 'bun:test';
import { codeLanguage } from './codeLanguage.js';
import { syntaxTokens } from './files/SyntaxSnippet.js';

describe('shared editor and search languages', () => {
  const cases = [
    ['package.JSON', '{"name": "test", "count": 42, "enabled": true}', ['tok-propertyName', 'tok-string', 'tok-number', 'tok-bool']],
    ['settings.jsonc', '// comment\n{"count": 42,}', ['tok-comment', 'tok-propertyName', 'tok-number']],
    ['settings.json5', "{name: 'test', count: 42}", ['tok-propertyName', 'tok-string', 'tok-number']],
    ['config.yml', 'name: "test"\ncount: 42', ['tok-propertyName', 'tok-string']],
    ['bunfig.toml', '[install]\nminimumReleaseAge = 2', ['tok-number']],
    ['script.sh', '#!/bin/sh\necho "test"', ['tok-meta', 'tok-string']],
    ['main.py', 'def test():\n    return 42', ['tok-keyword', 'tok-number']],
    ['query.sql', 'SELECT name FROM users WHERE id = 42', ['tok-keyword', 'tok-number']],
    ['logo.svg', '<svg width="42"></svg>', ['tok-typeName', 'tok-string']],
    ['styles.scss', '$color: red; .test { color: $color; }', ['tok-propertyName']],
    ['Dockerfile.dev', 'FROM node:24\nRUN echo "test"', ['tok-keyword']],
    ['.env.local', 'LABEL=test', ['tok-variableName']],
    ['source.mts', 'const test: number = 42;', ['tok-keyword', 'tok-typeName', 'tok-number']],
    ['bun.lock', '{"name": "test"}', ['tok-propertyName', 'tok-string']],
  ] as const;
  for (const [path, text, classes] of cases) {
    it(`uses the library parser for ${path}`, async () => {
      const language = await codeLanguage(path);
      expect(language).not.toBeNull();
      const tokens = syntaxTokens(language, text);
      expect(tokens.map((token) => token.text).join('')).toBe(text);
      for (const name of classes) expect(tokens.some((token) => token.classes.includes(name))).toBe(true);
    });
  }
  it('shares one load across files and keeps unsupported files plain', async () => {
    expect(codeLanguage('a.json')).toBe(codeLanguage('b.JSON'));
    expect(await codeLanguage('app.log')).toBeNull();
    expect(syntaxTokens(null, 'a test log')).toEqual([{ text: 'a test log', classes: '' }]);
  });
});
