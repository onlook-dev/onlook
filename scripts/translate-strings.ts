import Anthropic from '@anthropic-ai/sdk';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { placeholderMismatch } from '../packages/i18n/src/placeholders.js';
import {
  addUsage,
  areaRequest,
  chunks,
  composeGuide,
  divergentTerms,
  dollars,
  glossary,
  matchesAny,
  NO_USAGE,
  OUTPUT_SCHEMA,
  pendingByArea,
  roughTokens,
  SHARED_GUIDE,
  sourceHash,
  systemPrompt,
  type Catalog,
  type Lock,
  type Pending,
  type Table,
  type Usage,
} from './translate-plan.js';

const MODEL = 'claude-opus-5-5';
const EFFORT = 'medium';
const KEYS_PER_CALL = 120;
const CONCURRENT_AREAS = 4;

const i18nDir = join(import.meta.dirname, '..', 'packages/i18n/src');
const localesDir = join(i18nDir, 'locales');
const englishDir = join(localesDir, 'en');
const guidesDir = join(i18nDir, 'translate');
const notesDir = join(i18nDir, 'notes');
const lockPath = join(i18nDir, 'i18n.lock');

const USAGE = `bun run translate [--dry-run] [--locale ja,zh-CN] [--redo <key|prefix.*>,...] [--accept <key|prefix.*>,...]

  --dry-run   say what a run would send and roughly what it would cost; no key needed, nothing written
  --locale    only these languages (default: every language with a guide in ${guidesDir}, each read after ${SHARED_GUIDE})
  --redo      translate these keys again even though their English is unchanged, e.g. after a guide or note change
  --accept    record these keys' current translations as made from today's English, without calling the model`;

const { values: args } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    locale: { type: 'string', multiple: true, default: [] },
    redo: { type: 'string', multiple: true, default: [] },
    accept: { type: 'string', multiple: true, default: [] },
    help: { type: 'boolean', default: false },
  },
});
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}
const list = (values: string[]): string[] => values.flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
const redo = list(args.redo);
const accept = list(args.accept);
const dryRun = args['dry-run'];

function readTable(path: string): Table {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Table) : {};
}

function sorted(table: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(table).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

const areas = readdirSync(englishDir)
  .filter((file) => file.endsWith('.json'))
  .sort();
const english = new Map(areas.map((file) => [file, readTable(join(englishDir, file))]));
const allKeys = new Set([...english.values()].flatMap((table) => Object.keys(table)));

const sharedGuidePath = join(guidesDir, SHARED_GUIDE);
if (!existsSync(sharedGuidePath)) {
  console.log(`translate: ${sharedGuidePath} is missing; every language's guide is read after it.`);
  process.exit(1);
}
const sharedGuide = readFileSync(sharedGuidePath, 'utf8');

const guided = readdirSync(guidesDir)
  .filter((file) => file.endsWith('.md') && file !== SHARED_GUIDE)
  .map((file) => file.slice(0, -'.md'.length))
  .sort();
const asked = list(args.locale);
for (const locale of asked) {
  if (!guided.includes(locale)) {
    console.log(`translate: ${locale} has no guide in ${guidesDir}; languages with one: ${guided.join(', ')}.`);
    process.exit(1);
  }
}
const locales = asked.length > 0 ? asked : guided;

for (const pattern of [...redo, ...accept]) {
  if (![...allKeys].some((key) => matchesAny(key, [pattern]))) {
    console.log(`translate: ${pattern} names no English key.`);
    process.exit(1);
  }
}

const lock: Lock = existsSync(lockPath) ? (JSON.parse(readFileSync(lockPath, 'utf8')) as Lock) : {};

const LANGUAGE_NAMES: Readonly<Record<string, string>> = { 'zh-CN': 'Simplified Chinese' };

function languageName(locale: string): string {
  return LANGUAGE_NAMES[locale] ?? new Intl.DisplayNames(['en'], { type: 'language' }).of(locale) ?? locale;
}

function writeArea(locale: string, file: string, table: Table): void {
  const source = english.get(file) ?? {};
  const ordered: Table = {};
  for (const key of Object.keys(source)) if (table[key] !== undefined) ordered[key] = table[key];
  mkdirSync(join(localesDir, locale), { recursive: true });
  writeFileSync(join(localesDir, locale, file), `${JSON.stringify(ordered, null, 2)}\n`);
}

function writeLock(): void {
  const out: Lock = {};
  for (const locale of Object.keys(lock).sort()) {
    out[locale] = sorted(Object.fromEntries(Object.entries(lock[locale] ?? {}).filter(([key]) => allKeys.has(key))));
  }
  writeFileSync(lockPath, `${JSON.stringify(out, null, 2)}\n`);
}

function loadCatalog(locale: string): Catalog {
  return { english, translated: new Map(areas.map((file) => [file, readTable(join(localesDir, locale, file))])) };
}

function notesFor(file: string): string | undefined {
  const path = join(notesDir, `${file.slice(0, -'.json'.length)}.md`);
  return existsSync(path) ? readFileSync(path, 'utf8') : undefined;
}

const client = dryRun ? undefined : new Anthropic();

async function translateChunk(
  system: string,
  request: string,
): Promise<{ values: Map<string, string>; usage: Usage; model: string; refused: boolean }> {
  const stream = client!.beta.messages.stream({
    model: MODEL,
    max_tokens: 64_000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    output_config: { effort: EFFORT, format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    messages: [{ role: 'user', content: request }],
  });
  const message = await stream.finalMessage();
  const usage: Usage = {
    input: message.usage.input_tokens,
    cacheWrite: message.usage.cache_creation_input_tokens ?? 0,
    cacheRead: message.usage.cache_read_input_tokens ?? 0,
    output: message.usage.output_tokens,
  };
  const values = new Map<string, string>();
  const text = message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
  if (message.stop_reason === 'end_turn') {
    const parsed = JSON.parse(text) as { translations: { key: string; value: string }[] };
    for (const { key, value } of parsed.translations) values.set(key, value);
  }
  return { values, usage, model: message.model, refused: message.stop_reason === 'refusal' };
}

async function pool<T>(items: readonly T[], size: number, run: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(size, queue.length) }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await run(item);
    }),
  );
}

let total: Usage = NO_USAGE;
let estimate = 0;

for (const locale of locales) {
  const target = languageName(locale);
  const guide = composeGuide(sharedGuide, readFileSync(join(guidesDir, `${locale}.md`), 'utf8'), target);
  const catalog = loadCatalog(locale);
  const record = (lock[locale] ??= {});

  const accepted: string[] = [];
  for (const [file, source] of english) {
    const translated = catalog.translated.get(file) ?? {};
    for (const [key, text] of Object.entries(source)) {
      if (!matchesAny(key, accept)) continue;
      if (translated[key] === undefined) {
        console.log(`translate: ${locale} has no translation of ${key} to accept.`);
        process.exitCode = 1;
        continue;
      }
      record[key] = sourceHash(text);
      accepted.push(key);
    }
  }
  if (accepted.length > 0 && !dryRun) {
    writeLock();
    console.log(`translate: recorded ${accepted.length} ${locale} translations as current: ${accepted.join(', ')}.`);
  }

  const plan = pendingByArea(catalog, record, redo);
  const pendingKeys = new Set([...plan.values()].flat().map((item) => item.key));
  const keyCount = pendingKeys.size;

  if (dryRun) {
    console.log(`translate: ${locale}: the guide is ${SHARED_GUIDE} then ${locale}.md, roughly ${roughTokens(guide)} tokens.`);
    const divergent = divergentTerms(glossary(catalog, pendingKeys));
    if (keyCount === 0) {
      console.log(`translate: ${locale}: nothing to send; all ${allKeys.size} keys are current.`);
    } else {
      const system = systemPrompt(guide, glossary(catalog, pendingKeys), target);
      let inputTokens = 0;
      let outputTokens = 0;
      let calls = 0;
      console.log(`translate: ${locale}: ${keyCount} of ${allKeys.size} keys would be sent:`);
      for (const [file, pending] of plan) {
        const counts = (['new', 'changed', 'redo'] as const)
          .map((reason) => [reason, pending.filter((item) => item.reason === reason).length] as const)
          .filter(([, count]) => count > 0)
          .map(([reason, count]) => `${count} ${reason}`);
        console.log(`  ${file}: ${counts.join(', ')}`);
        for (const chunk of chunks(pending, KEYS_PER_CALL)) {
          calls++;
          const request = areaRequest({
            area: file.slice(0, -'.json'.length),
            target,
            notes: notesFor(file),
            existing: catalog.translated.get(file) ?? {},
            english: english.get(file) ?? {},
            pending: chunk,
          });
          inputTokens += roughTokens(system) + roughTokens(request);
          outputTokens += chunk.reduce((sum, item) => sum + roughTokens(item.key + item.english) * 3, 0);
        }
      }
      const cost = dollars({ input: inputTokens, cacheWrite: 0, cacheRead: 0, output: outputTokens });
      estimate += cost;
      console.log(
        `translate: ${locale}: ${calls} calls, roughly ${inputTokens} tokens in and ${outputTokens} out with thinking, about $${cost.toFixed(2)} uncached.`,
      );
    }
    if (divergent.length > 0) {
      console.log(`translate: ${locale}: ${divergent.length} English labels are translated more than one way (not an error; review them):`);
      for (const [term, values] of divergent) console.log(`  ${term} → ${values.join(' | ')}`);
    }
    continue;
  }

  if (keyCount === 0) {
    console.log(`translate: ${locale}: nothing to translate; all ${allKeys.size} keys are current.`);
    continue;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('translate: ANTHROPIC_API_KEY is not set. Pass a key to this command only, never to a shell that runs Studio or its tests.');
    process.exit(1);
  }

  console.log(`translate: ${locale}: translating ${keyCount} keys in ${plan.size} areas with ${MODEL}.`);
  let spent: Usage = NO_USAGE;
  const done = new Set<string>();
  const left: string[] = [];
  const order = [...plan].sort(([, a], [, b]) => a.length - b.length);

  await pool(order, CONCURRENT_AREAS, async ([file, pending]) => {
    const area = file.slice(0, -'.json'.length);
    const table = catalog.translated.get(file) ?? {};
    catalog.translated.set(file, table);
    const notes = notesFor(file);

    async function attempt(items: readonly Pending[], rejected?: Map<string, string>): Promise<Map<string, string>> {
      const outdated = new Set([...pendingKeys].filter((key) => !done.has(key)));
      const system = systemPrompt(guide, glossary(catalog, outdated), target);
      const request = areaRequest({ area, target, notes, existing: table, english: english.get(file) ?? {}, pending: items, ...(rejected ? { rejected } : {}) });
      const failures = new Map<string, string>();
      let result: Awaited<ReturnType<typeof translateChunk>>;
      try {
        result = await translateChunk(system, request);
      } catch (error) {
        console.log(`translate: ${locale} ${file}: the call failed: ${error instanceof Error ? error.message : String(error)}`);
        for (const item of items) failures.set(item.key, 'was not returned');
        return failures;
      }
      spent = addUsage(spent, result.usage);
      for (const item of items) {
        const value = result.values.get(item.key);
        const mismatch = value === undefined ? 'was not returned' : value.trim() === '' && item.english.trim() !== '' ? 'was empty' : placeholderMismatch(item.english, value);
        if (mismatch !== null || value === undefined) {
          failures.set(item.key, mismatch ?? 'was not returned');
          continue;
        }
        table[item.key] = value;
        record[item.key] = sourceHash(item.english);
        done.add(item.key);
      }
      writeArea(locale, file, table);
      writeLock();
      const served = result.model === MODEL ? '' : `, answered by ${result.model}`;
      const refused = result.refused ? ', refused' : '';
      console.log(`translate: ${locale} ${file}: ${items.length - failures.size} of ${items.length} kept, $${dollars(result.usage).toFixed(3)}${served}${refused}.`);
      return failures;
    }

    for (const chunk of chunks(pending, KEYS_PER_CALL)) {
      const failures = await attempt(chunk);
      if (failures.size === 0) continue;
      const retry = chunk.filter((item) => failures.has(item.key));
      const again = await attempt(retry, failures);
      for (const [key, why] of again) left.push(`${key} ${why}`);
    }
  });

  total = addUsage(total, spent);
  console.log(
    `translate: ${locale}: $${dollars(spent).toFixed(2)} (${spent.input} input, ${spent.cacheWrite} cache-write, ${spent.cacheRead} cache-read, ${spent.output} output tokens).`,
  );
  if (left.length > 0) {
    console.log(`translate: ${left.length} ${locale} keys stay as they were until the next run:`);
    for (const line of left) console.log(`  ${line}`);
    process.exitCode = 1;
  } else {
    console.log(`translate: ${locale}: every key is translated with its placeholders intact.`);
  }
}

if (dryRun) {
  if (estimate > 0) console.log(`translate: dry run, nothing written; about $${estimate.toFixed(2)} in all, before caching.`);
  else console.log('translate: dry run, nothing written.');
} else if (locales.length > 0) {
  console.log(`translate: this run cost $${dollars(total).toFixed(2)} at ${MODEL}'s list price.`);
}
