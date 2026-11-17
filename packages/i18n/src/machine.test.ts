import { afterEach, describe, expect, it } from 'bun:test';
import { setLocale, t } from './index.js';
import { en, type StringKey } from './strings.js';

type Language = 'en' | 'ja' | 'zh-CN';

const LANGUAGES: readonly Language[] = ['en', 'ja', 'zh-CN'];

/** Every surface that shows these offers one retry and nothing else: the creation-failure dialog's Try again, the setup card's Retry (ONL-3111). */
const CAUSES = (Object.keys(en) as StringKey[]).filter((key) => key.startsWith('machine.failure.'));

/** The Check your computer screen's own controls, which neither surface has. */
const ELSEWHERE: readonly StringKey[] = ['machine.again', 'machine.choose'];

/** A sentence can point at a control in words its label does not contain: "choose another folder" against Choose folder. */
const POINTING: Readonly<Record<Language, readonly string[]>> = {
  en: ['another folder'],
  ja: ['別のフォルダー'],
  'zh-CN': ['其他文件夹'],
};

/** Try again as each language writes it in a sentence (`i18n/translate/ja.md` and `zh-CN.md`, Retry). */
const TRY_AGAIN: Readonly<Record<Language, string>> = {
  en: 'then try again.',
  ja: 'もう一度お試しください。',
  'zh-CN': '后请重试。',
};

afterEach(() => setLocale(undefined));

describe('what the machine checks tell a later creation failure (ONL-3111)', () => {
  it('has a cause to word', () => {
    expect(CAUSES.length).toBeGreaterThan(0);
  });

  for (const language of LANGUAGES) {
    describe(language, () => {
      it('ends every line with the action the dialog offers', () => {
        setLocale(language);
        expect(CAUSES.filter((key) => !t(key).endsWith(TRY_AGAIN[language]))).toEqual([]);
      });

      it('names no control the dialog does not have', () => {
        setLocale(language);
        const pointers = [...ELSEWHERE.map((key) => t(key)), ...POINTING[language]].map((text) => text.toLowerCase());
        expect(pointers.filter((text) => text === '')).toEqual([]);
        expect(CAUSES.filter((key) => pointers.some((text) => t(key).toLowerCase().includes(text)))).toEqual([]);
      });
    });
  }
});
