import { createHash } from 'node:crypto';

export type Table = Record<string, string>;
/** Per locale, per key: the MD5 of the English its translation was made from. */
export type Lock = Record<string, Record<string, string>>;

export interface Catalog {
  english: Map<string, Table>;
  translated: Map<string, Table>;
}

export type Reason = 'new' | 'changed' | 'redo';

export interface Pending {
  key: string;
  english: string;
  reason: Reason;
  previous?: string;
}

export function sourceHash(english: string): string {
  return createHash('md5').update(english).digest('hex');
}

/** `chat.composer.*` names a family; anything else names one key. */
export function matchesAny(key: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => (pattern.endsWith('.*') ? key.startsWith(pattern.slice(0, -1)) : key === pattern));
}

export function pendingByArea(catalog: Catalog, record: Record<string, string>, redo: readonly string[]): Map<string, Pending[]> {
  const plan = new Map<string, Pending[]>();
  for (const [file, english] of catalog.english) {
    const translated = catalog.translated.get(file) ?? {};
    const pending: Pending[] = [];
    for (const [key, text] of Object.entries(english)) {
      const current = translated[key];
      if (matchesAny(key, redo)) pending.push({ key, english: text, reason: 'redo' });
      else if (current === undefined) pending.push({ key, english: text, reason: 'new' });
      else if (record[key] !== sourceHash(text)) pending.push({ key, english: text, reason: 'changed', previous: current });
    }
    if (pending.length > 0) plan.set(file, pending);
  }
  return plan;
}

export function glossary(catalog: Catalog, outdated: ReadonlySet<string>): Map<string, string[]> {
  const terms = new Map<string, string[]>();
  for (const [file, english] of catalog.english) {
    const translated = catalog.translated.get(file) ?? {};
    for (const [key, text] of Object.entries(english)) {
      const value = translated[key];
      if (value === undefined || outdated.has(key) || /[{\n]/.test(text) || text.trim().split(/\s+/).length > 3) continue;
      const seen = terms.get(text) ?? [];
      if (!seen.includes(value)) seen.push(value);
      terms.set(text, seen);
    }
  }
  return new Map([...terms].sort(([a], [b]) => a.localeCompare(b, 'en')));
}

export function divergentTerms(terms: Map<string, string[]>): [string, string[]][] {
  return [...terms].filter(([, values]) => values.length > 1);
}

export function noteFor(notes: string, key: string): string | undefined {
  const bullets = notes.split(/\n(?=- )/);
  return bullets.find((bullet) => bullet.startsWith(`- From \`${key}\``))?.trim();
}

export const SHARED_GUIDE = 'shared.md';

export function fillGuide(guide: string, target: string): string {
  return guide.replaceAll('{source}', 'English').replaceAll('{target}', target);
}

export function composeGuide(shared: string, language: string, target: string): string {
  return [fillGuide(shared, target).trim(), `For ${target} in particular:`, fillGuide(language, target).trim()].join('\n\n');
}

export function systemPrompt(guide: string, terms: Map<string, string[]>, target: string): string {
  const lines = [...terms].map(([english, values]) => `${english} → ${values.join(' / ')}`);
  return [
    guide.trim(),
    `How each request works: you get one area of the interface, the translator notes for that area, the strings of that area already in ${target}, and the strings to translate now. Match the existing translations: reuse their words for the same things, their tone and their form for buttons, labels and sentences. Where an existing translation disagrees with this guide, follow the guide. Translator notes say where a string appears and what it must do; they are context, never output. Return one translation for every key asked, each key exactly as given.`,
    lines.length === 0
      ? `No ${target} terms exist yet.`
      : `Terms already in use across the interface, English → ${target}. Reuse them for the same meaning; a slash separates translations used in different places:\n${lines.join('\n')}`,
  ].join('\n\n');
}

export function areaRequest(input: {
  area: string;
  target: string;
  notes: string | undefined;
  existing: Table;
  english: Table;
  pending: readonly Pending[];
  rejected?: ReadonlyMap<string, string>;
}): string {
  const existing = Object.entries(input.existing)
    .filter(([key]) => input.english[key] !== undefined && !input.pending.some((item) => item.key === key))
    .map(([key, value]) => ({ key, english: input.english[key], [input.target]: value }));
  const items = input.pending.map((item) => {
    const note = input.notes === undefined ? undefined : noteFor(input.notes, item.key);
    const fix = input.rejected?.get(item.key);
    return {
      key: item.key,
      english: item.english,
      ...(note === undefined ? {} : { note }),
      ...(item.previous === undefined ? {} : { previousTranslation: item.previous, why: 'the English changed since this translation; keep its wording where the meaning did not change' }),
      ...(fix === undefined ? {} : { fix: `your last translation ${fix}; keep every placeholder exactly as in the English` }),
    };
  });
  return [
    `Area: ${input.area}`,
    input.notes === undefined ? 'This area has no translator notes.' : `Translator notes for this area:\n${input.notes.trim()}`,
    existing.length === 0
      ? `Nothing in this area is in ${input.target} yet.`
      : `Already in ${input.target} in this area:\n${JSON.stringify(existing, null, 1)}`,
    `Translate these ${items.length} strings into ${input.target}:\n${JSON.stringify(items, null, 1)}`,
  ].join('\n\n');
}

export const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    translations: {
      type: 'array',
      items: {
        type: 'object',
        properties: { key: { type: 'string' }, value: { type: 'string' } },
        required: ['key', 'value'],
        additionalProperties: false,
      },
    },
  },
  required: ['translations'],
  additionalProperties: false,
} as const;

export function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let at = 0; at < items.length; at += size) out.push(items.slice(at, at + size));
  return out;
}

export interface Usage {
  input: number;
  cacheWrite: number;
  cacheRead: number;
  output: number;
}

/** List price of `MODEL` in translate-strings.ts, US dollars per million tokens; cache writes are the five-minute kind. */
export const PRICE = { input: 4, cacheWrite: 5, cacheRead: 0.2, output: 20 } as const;

export function dollars(usage: Usage): number {
  return (
    (usage.input * PRICE.input + usage.cacheWrite * PRICE.cacheWrite + usage.cacheRead * PRICE.cacheRead + usage.output * PRICE.output) /
    1_000_000
  );
}

export function addUsage(a: Usage, b: Usage): Usage {
  return { input: a.input + b.input, cacheWrite: a.cacheWrite + b.cacheWrite, cacheRead: a.cacheRead + b.cacheRead, output: a.output + b.output };
}

export const NO_USAGE: Usage = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };

/** Rough on purpose: UTF-8 bytes over three, which over-counts English and roughly matches CJK. */
export function roughTokens(text: string): number {
  return Math.ceil(Buffer.byteLength(text, 'utf8') / 3);
}
