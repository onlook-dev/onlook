import { describe, expect, it } from 'bun:test';
import { pseudoLocalize, resolveLocale, systemLocale } from './locale.js';

const supported = ['en', 'ja', 'zh-CN', 'pseudo'] as const;

describe('resolveLocale', () => {
  it('chooses nothing when no override is set and no system language is offered', () => {
    expect(resolveLocale({ preferred: [], supported })).toBeUndefined();
    expect(resolveLocale({ override: '', preferred: [], supported })).toBeUndefined();
  });

  it('maps a regional system language to its base language', () => {
    expect(resolveLocale({ preferred: ['ja-JP'], supported })).toBe('ja');
    expect(resolveLocale({ preferred: ['ja_JP'], supported })).toBe('ja');
  });

  it('reads every Simplified Chinese system language as zh-CN and no Traditional one', () => {
    for (const tag of ['zh-Hans-CN', 'zh-Hans', 'zh', 'zh_CN', 'zh-SG']) expect(resolveLocale({ preferred: [tag], supported })).toBe('zh-CN');
    for (const tag of ['zh-Hant-TW', 'zh-TW', 'zh-HK', 'zh-Hant']) expect(resolveLocale({ preferred: [tag], supported })).toBeUndefined();
  });

  it('takes the first system language Studio supports, in the order the system ranks them', () => {
    expect(resolveLocale({ preferred: ['de-DE', 'ja-JP', 'en-US'], supported })).toBe('ja');
    expect(resolveLocale({ preferred: ['de-DE', 'fr-FR'], supported })).toBeUndefined();
  });

  it('lets the override win over every system language', () => {
    expect(resolveLocale({ override: 'pseudo', preferred: ['ja-JP'], supported })).toBe('pseudo');
    expect(resolveLocale({ override: 'EN-gb', preferred: ['ja-JP'], supported })).toBe('en');
  });

  it('falls back to the system languages when the override names no supported language', () => {
    expect(resolveLocale({ override: 'xx', preferred: ['ja-JP'], supported })).toBe('ja');
    expect(resolveLocale({ override: 'xx', preferred: [], supported })).toBeUndefined();
  });

  it('never picks a language the build does not carry', () => {
    expect(resolveLocale({ override: 'ja', preferred: ['ja-JP'], supported: ['en', 'pseudo'] })).toBeUndefined();
  });
});

describe('systemLocale', () => {
  it('opens in Japanese on a Mac that ranks Japanese first', () => {
    expect(systemLocale(['ja-JP', 'en-US'])).toBe('ja');
  });

  it('keeps English, with the system formats, when the Mac ranks English above Japanese', () => {
    expect(systemLocale(['en-GB', 'ja-JP'])).toBeUndefined();
  });

  it('opens in English on a Mac set to a language Studio does not follow', () => {
    expect(systemLocale(['de-DE', 'fr-FR'])).toBeUndefined();
    expect(systemLocale(['pseudo'])).toBeUndefined();
  });
});

describe('pseudoLocalize', () => {
  it('marks every value and leaves no plain ASCII letter outside a placeholder', () => {
    const value = pseudoLocalize('Open {name} in {count} tabs');
    expect(value.startsWith('⟦') && value.endsWith('⟧')).toBe(true);
    expect(value.replace(/\{\w+\}/g, '')).not.toMatch(/[a-zA-Z]/);
  });

  it('leaves placeholders intact so t() still fills them', () => {
    expect(pseudoLocalize('Open {name} in {count} tabs').match(/\{\w+\}/g)).toEqual(['{name}', '{count}']);
  });

  it('keeps an empty value empty, since callers read it as absent', () => {
    expect(pseudoLocalize('')).toBe('');
  });
});
