export interface ArtifactReference { value: string; start: number; end: number }

export class ArtifactDependencyError extends Error {
  constructor(message: string, readonly start: number) { super(message); }
}

function cssReferences(text: string, base: number): ArtifactReference[] {
  const references: ArtifactReference[] = [];
  for (const match of text.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi)) {
    const value = match[1] ?? match[2] ?? match[3] ?? '';
    const start = base + (match.index ?? 0) + match[0].indexOf(value, match[0].indexOf('(') + 1);
    references.push({ value, start, end: start + value.length });
  }
  for (const match of text.matchAll(/@import\s+(["'])([^"']+)\1/gi)) {
    const value = match[2] ?? '';
    const start = base + (match.index ?? 0) + match[0].indexOf(value);
    references.push({ value, start, end: start + value.length });
  }
  return references;
}

function srcsetReferences(text: string, base: number): ArtifactReference[] {
  const references: ArtifactReference[] = [];
  let offset = 0;
  for (const candidate of text.split(',')) {
    const match = /^\s*([^\s,]+)(?:\s+(?:\d+(?:\.\d+)?x|\d+w))?\s*$/.exec(candidate);
    if (match === null) throw new Error('unsupported srcset candidate');
    const value = match[1] ?? '';
    const start = base + offset + candidate.indexOf(value);
    references.push({ value, start, end: start + value.length });
    offset += candidate.length + 1;
  }
  return references;
}

/** The `>` closing the tag opened at `from`, skipping quoted attribute values; `html.length` when unterminated. */
export function findTagEnd(html: string, from: number): number {
  let end = from + 1;
  let quote = '';
  for (; end < html.length; end += 1) {
    const character = html[end];
    if (quote !== '') { if (character === quote) quote = ''; }
    else if (character === '"' || character === "'") quote = character;
    else if (character === '>') break;
  }
  return end;
}

export function artifactReferences(text: string, extension: string, base = 0): ArtifactReference[] {
  if (extension === '.css') return cssReferences(text, 0);
  if (extension === '.js') {
    const dependency = /\b(?:import\s*(?:\(|[\w*{])|require\s*\(|fetch\s*\(|importScripts\s*\(|new\s+(?:Image|WebSocket|XMLHttpRequest|EventSource|RTCPeerConnection|Worker)\b)|\.(?:src|href|srcset)\s*=|\.setAttribute\s*\(\s*['"](?:src|href|srcset)['"]/u.exec(text)
      ?? /(?:(?:https?|wss?|studio-artifact):\/\/|(?:\b|\\(?:[bfnrtv]|[0-7]{1,3}|x[\da-f]{2}|u[\da-f]{4}))file:)/iu.exec(text);
    if (dependency !== null) {
      const action = /^(?:import|require)/.test(dependency[0]) ? 'import' : 'resource access';
      throw new ArtifactDependencyError(`Remove this script ${action} and use self-contained classic JavaScript.`, base + dependency.index);
    }
    return [];
  }
  const references: ArtifactReference[] = [];
  let offset = 0;
  while (offset < text.length) {
    const start = text.indexOf('<', offset);
    if (start < 0) break;
    if (text.startsWith('<!--', start)) {
      const end = text.indexOf('-->', start + 4);
      offset = end < 0 ? text.length : end + 3;
      continue;
    }
    const end = findTagEnd(text, start);
    if (end >= text.length) throw new Error('incomplete HTML tag');
    const tag = text.slice(start, end + 1);
    const name = /^<\s*([a-z\d-]+)/i.exec(tag)?.[1]?.toLowerCase();
    if (['base', 'iframe', 'object', 'embed', 'video', 'audio', 'source', 'track'].includes(name ?? '')) throw new ArtifactDependencyError(`Remove this <${name}> element from the import copy.`, start);
    if (/\stype\s*=\s*["']?module\b/i.test(tag)) throw new ArtifactDependencyError('Replace this module script with self-contained classic JavaScript.', start);
    for (const match of tag.matchAll(/\s(src|srcset|href|style|action|formaction)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      const value = match[2] ?? match[3] ?? match[4] ?? '';
      const valueStart = start + (match.index ?? 0) + match[0].indexOf(value, match[0].indexOf('=') + 1);
      if (match[1]?.toLowerCase() === 'style') references.push(...cssReferences(value, valueStart));
      else if (match[1]?.toLowerCase() === 'srcset') references.push(...srcsetReferences(value, valueStart));
      else references.push({ value, start: valueStart, end: valueStart + value.length });
    }
    offset = end + 1;
    if (name === 'script' || name === 'style') {
      const closing = text.toLowerCase().indexOf(`</${name}`, offset);
      if (closing < 0) throw new Error('incomplete raw-text tag');
      if (name === 'style') references.push(...cssReferences(text.slice(offset, closing), offset));
      if (name === 'script') artifactReferences(text.slice(offset, closing), '.js', offset);
      offset = closing;
    }
  }
  return references;
}

export function rewriteArtifactReferences(text: string, replacements: { reference: ArtifactReference; value: string }[]): string {
  let rewritten = text;
  for (const { reference, value } of [...replacements].sort((first, second) => second.reference.start - first.reference.start)) {
    rewritten = rewritten.slice(0, reference.start) + value + rewritten.slice(reference.end);
  }
  return rewritten;
}
