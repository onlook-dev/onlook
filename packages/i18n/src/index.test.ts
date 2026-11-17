import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { activeLocale, htmlLang, intlLocale, setLocale, t, translatedTable, type StringKey } from './index.js';
import { ja } from './ja.js';
import { en } from './strings.js';
import { zhCN } from './zh-CN.js';

afterEach(() => setLocale(undefined));

describe('t() with a chosen language', () => {
  it('reads English and keeps the system formatting while no language is chosen', () => {
    expect(activeLocale()).toBeUndefined();
    expect(t('menu.file')).toBe(en['menu.file']);
    expect(intlLocale()).toBeUndefined();
    expect(htmlLang()).toBe('en');
  });

  it('reads the pseudo language for every key, filling placeholders and keeping the product name', () => {
    setLocale('pseudo');
    for (const key of Object.keys(en) as StringKey[]) {
      if (en[key] === '' || key === 'app.name') continue;
      expect(t(key, { name: 'x', count: 1 })).toStartWith('⟦');
    }
    expect(t('menu.about')).toContain(en['app.name']);
    expect(t('app.name')).toBe(en['app.name']);
  });

  it('reads Japanese, keeping the edition\'s product name', () => {
    setLocale('ja');
    expect(t('menu.file')).toBe(ja['menu.file']!);
    expect(t('app.name')).toBe(en['app.name']);
    expect(t('menu.about')).toContain(en['app.name']);
    expect(htmlLang()).toBe('ja');
  });

  it('reads English for a translation whose placeholders no longer match', () => {
    const english = { 'menu.quit': 'Quit {app}', 'menu.tabs.number': 'Tab {count}', 'menu.file': 'File' } as const;
    const table = translatedTable({ 'menu.quit': '{app} を終了', 'menu.tabs.number': 'タブ {number}', 'menu.file': 'ファイル' }, english);
    expect(table['menu.quit']).toBe('{app} を終了');
    expect(table['menu.file']).toBe('ファイル');
    expect(table['menu.tabs.number']).toBeUndefined();
  });

  it('renders a key missing from every table as empty', () => {
    setLocale('pseudo');
    expect(t('no.such.key' as StringKey)).toBe('');
  });

  it('tags the page and formats numbers for the chosen language', () => {
    setLocale('en');
    expect(intlLocale()).toBe('en');
    expect(htmlLang()).toBe('en');
    setLocale('pseudo');
    expect(htmlLang()).toBe('en-XA');
    setLocale('zh-CN');
    expect(intlLocale()).toBe('zh-CN');
    expect(htmlLang()).toBe('zh-CN');
  });
});

describe('a language table built from its own catalog files', () => {
  // A file no table spreads reads English in that language with every check passing (ONL-3111).
  const TABLES: Readonly<Record<string, Readonly<Partial<Record<StringKey, string>>>>> = { ja, 'zh-CN': zhCN };
  const root = join(import.meta.dir, 'locales');

  const written = (language: string): string[] =>
    readdirSync(join(root, language))
      .filter((file) => file.endsWith('.json'))
      .flatMap((file) => Object.keys(JSON.parse(readFileSync(join(root, language, file), 'utf8')) as Record<string, string>));

  // English is held by `strings.ts`, where a file nothing imports mints no `StringKey` and fails typecheck at its first `t()`.
  const languages = readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name !== 'en').map((entry) => entry.name);

  it('exists for every language beside English', () => {
    expect(languages.length).toBeGreaterThan(0);
    expect(languages.filter((language) => TABLES[language] === undefined)).toEqual([]);
  });

  it('holds every key its language has a translation for', () => {
    for (const language of languages) {
      const table = TABLES[language] ?? {};
      expect(written(language).filter((key) => table[key as StringKey] === undefined)).toEqual([]);
    }
  });
});
