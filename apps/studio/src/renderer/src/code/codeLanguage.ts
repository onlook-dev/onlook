import { LanguageDescription, LanguageSupport, StreamLanguage } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { tags } from '@lezer/highlight';
import { log } from '../log.js';

const markdown = LanguageDescription.of({
  name: 'Markdown',
  extensions: ['md', 'mdx', 'markdown', 'mdown', 'mkd'],
  load: () => import('@codemirror/lang-markdown').then((m) => m.markdown({ base: m.markdownLanguage, codeLanguages: languages })),
});
const jsonWithComments = LanguageDescription.of({
  name: 'JSON with comments',
  extensions: ['jsonc', 'json5'],
  load: () => import('@codemirror/legacy-modes/mode/javascript').then((m) => new LanguageSupport(StreamLanguage.define({ ...m.json, tokenTable: { property: tags.propertyName } }))),
});
const descriptions = [markdown, jsonWithComments, ...languages];
const plain = Promise.resolve(null);
const loaded = new WeakMap<LanguageDescription, Promise<LanguageSupport | null>>();

/** Registry parsers load once per language, shared by editors and search rows. */
export function codeLanguage(path: string): Promise<LanguageSupport | null> {
  const basename = path.split('/').at(-1) ?? path;
  const name = basename.toLowerCase();
  const alias = name === 'bun.lock' ? 'package.json'
    : /^\.env(?:\.|$)/.test(name) ? 'settings.properties'
    : /^dockerfile(?:\.|$)/.test(name) ? 'Dockerfile'
    : /\.(?:mts|cts)$/.test(name) ? 'source.ts'
    : name.endsWith('.zsh') ? 'script.sh' : name;
  const description = LanguageDescription.matchFilename(descriptions, basename)
    ?? LanguageDescription.matchFilename(descriptions, alias);
  if (description === null) return plain;
  const existing = loaded.get(description);
  if (existing !== undefined) return existing;
  const promise = description.load().catch((error: unknown) => {
    // An unavailable parser must never prevent reading or editing the file.
    log('code').warn('language parser unavailable', { language: description.name, error });
    return null;
  });
  loaded.set(description, promise);
  return promise;
}
