// Structural types, never `Element`, and no Electron import: the tests build plain objects and `guest.ts` cannot load under `bun test` (ONL-1779).
import {
  EVIDENCE_CLASSES_MAX,
  EVIDENCE_CLASS_MAX,
  EVIDENCE_DOM_PATH_MAX,
  EVIDENCE_FRAME_URL_MAX,
  EVIDENCE_ID_MAX,
  EVIDENCE_OUTER_HTML_MAX,
  EVIDENCE_PATH_DEPTH_MAX,
  EVIDENCE_TAG_MAX,
  EVIDENCE_TEXT_MAX,
  utf8Bytes,
  type ElementEvidence,
  type ElementSelectionSeed,
} from '@studio/events';

export interface PickNode {
  tagName: string;
  parentElement: PickNode | null;
  children: ArrayLike<PickNode>;
  classList: ArrayLike<string>;
  textContent: string | null;
  outerHTML: string;
  isConnected?: boolean;
}

export interface PickRoot {
  querySelector(selectors: string): PickNode | null;
  querySelectorAll(selectors: string): ArrayLike<PickNode>;
}

export function truncate(value: string, max: number): string {
  if (utf8Bytes(value) <= max) return value;
  const marker = '\n...\n';
  const available = max - utf8Bytes(marker);
  return `${takeUtf8Head(value, Math.ceil(available / 2))}${marker}${takeUtf8Tail(
    value,
    Math.floor(available / 2),
  )}`;
}

function takeUtf8Head(value: string, max: number): string {
  let output = '';
  let used = 0;
  for (const point of value) {
    const size = utf8Bytes(point);
    if (used + size > max) break;
    output += point;
    used += size;
  }
  return output;
}

function takeUtf8Tail(value: string, max: number): string {
  const points = Array.from(value);
  let output = '';
  let used = 0;
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index] ?? '';
    const size = utf8Bytes(point);
    if (used + size > max) break;
    output = point + output;
    used += size;
  }
  return output;
}

function truncateHead(value: string, max: number): string {
  return utf8Bytes(value) <= max ? value : takeUtf8Head(value, max);
}

// Sibling position, not id or class: generated class names change every rebuild.
export function domPathOf(element: PickNode): string {
  const segments: string[] = [];
  let node: PickNode | null = element;
  while (node) {
    const tag = node.tagName.toLowerCase();
    const parent: PickNode | null = node.parentElement;
    if (!parent) {
      segments.unshift(tag);
      break;
    }
    let index = 1;
    for (let i = 0; i < parent.children.length; i += 1) {
      const sibling = parent.children[i];
      if (sibling === node) break;
      if (sibling?.tagName === node.tagName) index += 1;
    }
    segments.unshift(`${tag}:nth-of-type(${index})`);
    node = parent;
  }
  const bounded = segments.slice(-EVIDENCE_PATH_DEPTH_MAX);
  while (bounded.length > 1 && utf8Bytes(bounded.join(' > ')) > EVIDENCE_DOM_PATH_MAX) {
    bounded.shift();
  }
  return truncateHead(bounded.join(' > '), EVIDENCE_DOM_PATH_MAX);
}

function classesOf(element: PickNode): string[] {
  return Array.from(element.classList)
    .slice(0, EVIDENCE_CLASSES_MAX)
    .map((className) => truncateHead(className, EVIDENCE_CLASS_MAX))
    .filter((className) => className.length > 0);
}

function textOf(element: PickNode): string {
  return truncateHead((element.textContent ?? '').trim(), EVIDENCE_TEXT_MAX);
}

function minimizeFrameUrl(frameUrl: string): string {
  try {
    const url = new URL(frameUrl);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return truncateHead(url.toString(), EVIDENCE_FRAME_URL_MAX);
  } catch {
    return 'about:blank';
  }
}

function minimizeUrlAttribute(value: string): string {
  const trimmed = value.trim();
  if (/^(?:data|blob|javascript):/iu.test(trimmed)) return '[redacted]';
  const withoutCredentials = trimmed.replace(
    /^((?:[a-z][a-z0-9+.-]*:\/\/|\/\/))[^/@\s]+@/iu,
    '$1',
  );
  const secretBoundary = withoutCredentials.search(/[?#]/u);
  return secretBoundary === -1 ? withoutCredentials : withoutCredentials.slice(0, secretBoundary);
}

function minimizeSrcset(value: string): string {
  if (/(?:^|,\s*)(?:data|blob|javascript):/iu.test(value)) return '[redacted]';
  return value
    .split(',')
    .map((candidate) => {
      const trimmed = candidate.trim();
      const separator = trimmed.search(/\s/u);
      const url = separator === -1 ? trimmed : trimmed.slice(0, separator);
      const descriptor = separator === -1 ? '' : trimmed.slice(separator).trim();
      const minimized = minimizeUrlAttribute(url);
      return descriptor.length > 0 ? `${minimized} ${descriptor}` : minimized;
    })
    .join(', ');
}

/** A quoted value may hold the other quote (`"don't"`); `parseElementEvidence` reads values the same way. */
function minimizeOuterHtml(outerHtml: string): string {
  const withoutValues = outerHtml.replace(
    /(\svalue\s*=\s*)(?:"[^"]*"|'[^']*')/giu,
    '$1"[redacted]"',
  );
  const withoutCredentials = withoutValues.replace(
    /(\s[^\s=>]*(?:passw(?:or)?d|token|secret|auth|api[-_]?key|access[-_]?key)[^\s=>]*\s*=\s*)(?:"[^"]*"|'[^']*')/giu,
    '$1"[redacted]"',
  );
  const withoutUrlSecrets = withoutCredentials.replace(
    /(\s(?:href|src|srcset|action|formaction|poster|cite|data|xlink:href)\s*=\s*)(?:"([^"]*)"|'([^']*)')/giu,
    (_match, prefix: string, doubled: string | undefined, single: string | undefined) => {
      const quote = doubled === undefined ? "'" : '"';
      const value = doubled ?? single ?? '';
      return `${prefix}${quote}${/^\s*srcset\s*=/iu.test(prefix) ? minimizeSrcset(value) : minimizeUrlAttribute(value)}${quote}`;
    },
  );
  const withoutEmbeddedUrls = withoutUrlSecrets.replace(
    /(\s(?:style|srcdoc)\s*=\s*)(?:"[^"]*"|'[^']*')/giu,
    '$1"[redacted]"',
  );
  return withoutEmbeddedUrls.replace(
    /(<textarea\b[^>]*>)[\s\S]*?(<\/textarea>)/giu,
    '$1[redacted]$2',
  );
}

export function mintPickId(pageCrypto: Pick<Crypto, 'getRandomValues'>): string {
  const bytes = pageCrypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function evidenceOf(element: PickNode, id: string, frameUrl: string): ElementEvidence {
  const tag = truncateHead(element.tagName.toLowerCase(), EVIDENCE_TAG_MAX);
  const minimizedOuterHtml = minimizeOuterHtml(element.outerHTML);
  const containsFormControl = /<(?:input|textarea|select)\b/iu.test(element.outerHTML);
  return {
    kind: 'element',
    id: truncateHead(id, EVIDENCE_ID_MAX),
    tag,
    domPath: domPathOf(element),
    outerHtmlSnippet: truncate(minimizedOuterHtml, EVIDENCE_OUTER_HTML_MAX),
    textContent: containsFormControl ? '' : textOf(element),
    classes: classesOf(element),
    frameUrl: minimizeFrameUrl(frameUrl),
  };
}

export function relocate(
  seed: ElementSelectionSeed,
  root: PickRoot,
  current: PickNode | null = null,
): PickNode | null {
  if (current?.isConnected) return current;
  const byPath = queryPath(seed.domPath, root);
  const found = root.querySelectorAll(seed.tag);
  const candidates: PickNode[] = [];
  if (byPath && byPath.tagName.toLowerCase() === seed.tag) candidates.push(byPath);
  for (let i = 0; i < found.length; i += 1) {
    const el = found[i];
    if (!el || el.tagName.toLowerCase() !== seed.tag || candidates.includes(el)) continue;
    candidates.push(el);
  }
  const credible = candidates.filter((candidate) => {
    const classes = classesOf(candidate);
    const classesMatch =
      seed.classes.length > 0 &&
      classes.length === seed.classes.length &&
      seed.classes.every((className) => classes.includes(className));
    const textMatches = seed.textContent.length > 0 && textOf(candidate) === seed.textContent;
    return classesMatch || textMatches;
  });
  if (credible.length === 1) return credible[0] ?? null;
  if (credible.length > 1) return null;
  return candidates.length === 1 ? (candidates[0] ?? null) : null;
}

function queryPath(domPath: string, root: PickRoot): PickNode | null {
  if (domPath.length === 0) return null;
  try {
    return root.querySelector(domPath);
  } catch {
    return null;
  }
}
