export const LOCALES = ['en', 'ja', 'zh-CN', 'pseudo'] as const;

export type Locale = (typeof LOCALES)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

function match<L extends string>(tag: string, supported: readonly L[]): L | undefined {
  const normalized = tag.trim().toLowerCase().replace(/_/g, '-');
  if (normalized === '') return undefined;
  const exact = supported.find((locale) => locale.toLowerCase() === normalized);
  if (exact !== undefined) return exact;
  const wanted = script(normalized);
  return wanted === undefined ? undefined : supported.find((locale) => script(locale) === wanted);
}

/** Language and script, so zh-TW (Traditional) never reads Simplified zh-CN, and en-GB still reads en. */
function script(tag: string): string | undefined {
  try {
    const { language, script } = new Intl.Locale(tag).maximize();
    return `${language}-${script ?? ''}`;
  } catch {
    return undefined;
  }
}

export interface LocaleChoice<L extends string> {
  override?: string | undefined;
  preferred: readonly string[];
  supported: readonly L[];
}

/** `undefined` means nothing was chosen: lookup reads English and `Intl` keeps the system's default. */
export function resolveLocale<L extends string>({ override, preferred, supported }: LocaleChoice<L>): L | undefined {
  if (override !== undefined) {
    const forced = match(override, supported);
    if (forced !== undefined) return forced;
  }
  for (const tag of preferred) {
    const found = match(tag, supported);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** The languages a Mac's own setting opens Studio in; a language joins once a build in it has been walked (ONL-3136). */
export const SYSTEM_LOCALES = ['en', 'ja'] as const satisfies readonly Locale[];

/** English chooses nothing, so `Intl` keeps the system's regional formats. */
export function systemLocale(preferred: readonly string[]): Locale | undefined {
  const found = resolveLocale({ preferred, supported: SYSTEM_LOCALES });
  return found === 'en' ? undefined : found;
}

const PSEUDO_LETTERS: Readonly<Record<string, string>> = {
  a: 'á', b: 'ƀ', c: 'ç', d: 'ð', e: 'é', f: 'ƒ', g: 'ĝ', h: 'ĥ', i: 'í', j: 'ĵ', k: 'ķ', l: 'ļ', m: 'ɱ',
  n: 'ñ', o: 'ö', p: 'þ', q: 'ǫ', r: 'ŕ', s: 'š', t: 'ţ', u: 'ü', v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ž',
  A: 'Á', B: 'Ɓ', C: 'Ç', D: 'Ð', E: 'É', F: 'Ƒ', G: 'Ĝ', H: 'Ĥ', I: 'Í', J: 'Ĵ', K: 'Ķ', L: 'Ļ', M: 'Ṁ',
  N: 'Ñ', O: 'Ö', P: 'Þ', Q: 'Ǫ', R: 'Ŕ', S: 'Š', T: 'Ţ', U: 'Ü', V: 'Ṽ', W: 'Ŵ', X: 'Ẋ', Y: 'Ý', Z: 'Ž',
};

/** Placeholders (`{name}`) pass through untouched; an empty value stays empty, since `''` means "absent" to callers. */
export function pseudoLocalize(value: string): string {
  if (value === '') return value;
  const body = value
    .split(/(\{\w+\})/)
    .map((part) => (/^\{\w+\}$/.test(part) ? part : part.replace(/[a-zA-Z]/g, (letter) => PSEUDO_LETTERS[letter] ?? letter)))
    .join('');
  return `⟦${body}⟧`;
}
