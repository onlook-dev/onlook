import { edition } from './edition/cloud.js';
import { ja } from './ja.js';
import { isLocale, pseudoLocalize, type Locale } from './locale.js';
import { placeholderMismatch } from './placeholders.js';
import { en, type StringKey, type StringParams } from './strings.js';
import { zhCN } from './zh-CN.js';

type Table = Readonly<Partial<Record<StringKey, string>>>;

const TRANSLATIONS: Readonly<Record<Exclude<Locale, 'en' | 'pseudo'>, Table>> = { ja, 'zh-CN': zhCN };

/** A translated value whose placeholders differ from English is stale until the next `bun run translate`, so it reads English (ONL-2665). */
export function translatedTable(translated: Table, english: Table): Table {
  const table: Partial<Record<StringKey, string>> = {};
  for (const [key, source] of Object.entries(english) as [StringKey, string][]) {
    const value = translated[key];
    if (value !== undefined && placeholderMismatch(source, value) === null) table[key] = value;
  }
  return { ...table, ...edition.brand };
}

function tableFor(locale: Locale | undefined): Table {
  if (locale === undefined || locale === 'en') return en;
  if (locale === 'pseudo') {
    const table: Partial<Record<StringKey, string>> = {};
    for (const [key, value] of Object.entries(en) as [StringKey, string][]) table[key] = pseudoLocalize(value);
    return { ...table, 'app.name': en['app.name'] };
  }
  return translatedTable(TRANSLATIONS[locale], en);
}

/** The preload exposes main's choice before any renderer module loads; main itself calls `setLocale` (ONL-3136). */
function injectedLocale(): Locale | undefined {
  const value = (globalThis as { studioLocale?: unknown }).studioLocale;
  return isLocale(value) ? value : undefined;
}

let active = injectedLocale();
let table = tableFor(active);

export function setLocale(locale: Locale | undefined): void {
  active = locale;
  table = tableFor(locale);
}

export function activeLocale(): Locale | undefined {
  return active;
}

/** `undefined` keeps the system's formatting while no language was chosen. */
export function intlLocale(): string | undefined {
  return active === 'pseudo' ? 'en' : active;
}

export function htmlLang(): string {
  return active === 'pseudo' ? 'en-XA' : (active ?? 'en');
}

export function t(key: StringKey, params?: StringParams): string {
  const template = table[key] ?? en[key] ?? '';
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params?.[name] ?? (name === 'app' ? (table['app.name'] ?? en['app.name']) : undefined);
    return value === undefined ? match : String(value);
  });
}

export { LOCALES, resolveLocale, systemLocale, type Locale } from './locale.js';
export type { StringKey, StringParams };
