import { artifactSummaryPages, type ArtifactSearchRequest, type ArtifactSearchResult, type ArtifactSummary } from '@studio/events';
import type { ArtifactStore } from './adapter.js';
import { artifactRendererAdmitted } from './preview-admission.js';
import { findTagEnd } from './references.js';

const OMIT = new Set(['head', 'script', 'style', 'template', 'textarea', 'select', 'option', 'noscript', 'iframe', 'object']);
const RAW = new Set(['script', 'style', 'textarea', 'iframe', 'xmp', 'title']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const ENTITIES: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '};

export function artifactReadableText(html: string): string {
  const chunks: string[] = [];
  let offset = 0;
  const stack: {tag: string; omitted: boolean}[] = [];
  let size = 0;
  while (offset < html.length && size < 16384) {
    if (html.startsWith('<!--', offset)) {
      const end = html.indexOf('-->', offset + 4);
      if (end < 0) break;
      offset = end + 3;
      continue;
    }
    if (html[offset] === '<') {
      const end = findTagEnd(html, offset);
      if (end === html.length) break;
      const token = html.slice(offset, end + 1);
      const parsed = /^<\s*(\/?)\s*([a-z][\w:-]*)\b/i.exec(token);
      const tag = parsed?.[2]?.toLowerCase();
      if (tag === 'plaintext') break;
      if (tag && parsed?.[1] === '/') {
        const index = stack.findLastIndex((entry) => entry.tag === tag);
        if (index >= 0) stack.splice(index);
      } else if (tag && RAW.has(tag)) {
        const closing = new RegExp(`</${tag}\\s*>`, 'ig');
        closing.lastIndex = end + 1;
        if (closing.exec(html) === null) break;
        offset = closing.lastIndex;
        chunks.push(' ');
        continue;
      } else if (tag && !VOID.has(tag)) {
        if (stack.length >= 256) break;
        stack.push({tag, omitted: stack.at(-1)?.omitted === true || OMIT.has(tag) || /\s(?:hidden|aria-hidden\s*=\s*["']?true)(?:\s|["'>=])/i.test(token)});
      }
      chunks.push(' ');
      offset = end + 1;
      continue;
    }
    const end = html.indexOf('<', offset);
    const text = html.slice(offset, end < 0 ? html.length : end).slice(0, 16384 - size);
    if (stack.at(-1)?.omitted !== true) {chunks.push(text); size += text.length;}
    offset = end < 0 ? html.length : end;
  }
  return chunks.join('').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
    if (!entity.startsWith('#')) return ENTITIES[entity.toLowerCase()] ?? whole;
    const code = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : ' ';
  }).replace(/\s+/g, ' ').trim().toLowerCase();
}

function artifactNameRank(artifact: ArtifactSummary, query: string): number | undefined {
  const name = artifact.title.toLowerCase();
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  if ((artifact.pages ?? []).some((page) => page.name.toLowerCase().includes(query))) return 3;
  return undefined;
}

export function createArtifactTextSearch(store: Pick<ArtifactStore, 'list' | 'readPage'>) {
  let generation = 0;
  let held: {work: Promise<{records: ArtifactSummary[]; texts: Map<string, string>; partial: boolean}>} | undefined;
  return {
    invalidate(): void { generation += 1; held = undefined; },
    async search(query: string, wanted: () => boolean): Promise<ArtifactSearchResult> {
      const revision = generation;
      if (!wanted()) return {outcome: 'stale'};
      if (query.trim() === '') {
        const records = await store.list();
        return !wanted() || revision !== generation ? {outcome: 'stale'} : {outcome: 'ready', matches: records.map((record) => ({artifactId: record.id, rank: 0})), partial: false};
      }
      if (held === undefined) {
        const work = (async () => {
          const records = await store.list();
          const limited = records.slice(0, 512);
          const texts = new Map<string, string>();
          let bytes = 0;
          let pages = 0;
          let characters = 0;
          let partial = records.length > limited.length;
          for (const artifact of limited) {
            const fragments: string[] = [];
            for (const page of artifactSummaryPages(artifact)) {
              if (revision !== generation) return {records, texts, partial: true};
              if (pages >= 1024 || bytes >= 8 * 1024 * 1024 || characters >= 2 * 1024 * 1024) { partial = true; break; }
              pages += 1;
              if (pages % 4 === 1) await new Promise<void>((resolve) => setImmediate(resolve));
              if (revision !== generation) return {records, texts, partial: true};
              const html = await store.readPage(artifact.id, page.path, Math.min(1024 * 1024, 8 * 1024 * 1024 - bytes));
              if (html === null) { partial = true; continue; }
              const length = Buffer.byteLength(html);
              bytes += length;
              if (length > 1024 * 1024 || bytes > 8 * 1024 * 1024) {partial = true; continue;}
              const text = artifactReadableText(html);
              if (text.length >= 16384) partial = true;
              characters += text.length;
              fragments.push(text);
            }
            texts.set(artifact.id, fragments.join(' '));
          }
          return {records, texts, partial};
        })();
        held = {work};
        void work.catch(() => {if (held?.work === work) held = undefined;});
      }
      const {records, texts, partial} = await held.work;
      if (!wanted() || revision !== generation) return {outcome: 'stale'};
      const needle = query.trim().toLowerCase();
      const matches = records.flatMap((record) => {
        const rank = needle === '' ? 0 : artifactNameRank(record, needle) ?? (texts.get(record.id)?.includes(needle) ? 4 : undefined);
        return rank === undefined ? [] : [{artifactId: record.id, rank}];
      });
      return {outcome: 'ready', matches, partial};
    },
  };
}

export function createArtifactSearchHandler(deps: {renderers(): readonly Electron.WebContents[]; search(query: string, wanted: () => boolean): Promise<ArtifactSearchResult>}) {
  return async (event: {sender: Electron.WebContents; senderFrame: Electron.WebFrameMain | null}, request: ArtifactSearchRequest): Promise<ArtifactSearchResult> => {
    const wanted = () => artifactRendererAdmitted(event, deps.renderers());
    if (!wanted() || !request || typeof request.query !== 'string' || request.query.length > 200) return {outcome: 'unavailable'};
    try {return await deps.search(request.query, wanted);} catch {return {outcome: 'unavailable'};}
  };
}
