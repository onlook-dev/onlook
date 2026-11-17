import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { ARTIFACT_TEXT_MAX_LENGTH } from '@studio/events';
import { MAX_ARTIFACT_FILE_BYTES } from './files.js';

type SourceNode = DefaultTreeAdapterMap['node'];
type SourceElement = DefaultTreeAdapterMap['element'];
const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const NEVER_TEXT = new Set(['html', 'head', 'body', 'script', 'style', 'textarea', 'title', 'noscript', 'xmp', 'plaintext', 'iframe', 'noembed', 'noframes', 'template', 'input', 'select', 'option']);

export interface ArtifactTextMapping {
  domPath: string;
  text: string;
  start: number;
  end: number;
  literal: string;
}

export function validArtifactText(text: unknown): text is string {
  return typeof text === 'string' && text.length <= ARTIFACT_TEXT_MAX_LENGTH && !/[\u0000\r]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(text);
}

function element(node: SourceNode): node is SourceElement {
  return 'tagName' in node;
}

function staticDocument(source: string): DefaultTreeAdapterMap['document'] | undefined {
  if (Buffer.byteLength(source) > MAX_ARTIFACT_FILE_BYTES) return undefined;
  let invalid = false;
  const document = parse(source, { sourceCodeLocationInfo: true, onParseError: error => { if (error.code !== 'missing-doctype') invalid = true; } });
  if (invalid) return undefined;
  const pending: { node: SourceNode; depth: number }[] = [{ node: document, depth: 0 }];
  let visited = 0;
  while (pending.length) {
    const current = pending.pop()!;
    if (++visited > 20000 || current.depth > 64) return undefined;
    if (element(current.node)) {
      if (['script', 'iframe', 'object', 'embed'].includes(current.node.tagName)) return undefined;
      if (current.node.attrs.some(attribute => /^on/i.test(attribute.name) || attribute.name === 'contenteditable' || /^javascript:/i.test(attribute.value.replace(/[\u0000-\u0020\u007f]/g, '')))) return undefined;
      if (current.node.tagName === 'template' && 'content' in current.node) pending.push({node: (current.node as DefaultTreeAdapterMap['template']).content, depth: current.depth + 1});
    }
    if ('childNodes' in current.node) for (const child of current.node.childNodes) pending.push({node: child, depth: current.depth + 1});
  }
  return document;
}

export function mapArtifactText(source: string, domPath: string, liveText: string): ArtifactTextMapping | undefined {
  if (typeof source !== 'string' || typeof domPath !== 'string' || domPath.length > 2048 || !validArtifactText(liveText)) return undefined;
  const segments = domPath.split('>');
  if (segments.length > 64 || !segments.every(segment => /^[a-z][a-z0-9-]{0,63}:nth-of-type\([1-9][0-9]{0,4}\)$/.test(segment))) return undefined;
  let current: SourceNode | undefined = staticDocument(source);
  for (const segment of segments) {
    const [, tag, position] = /^([a-z][a-z0-9-]*):nth-of-type\(([0-9]+)\)$/.exec(segment)!;
    if (!current || !('childNodes' in current)) return undefined;
    current = current.childNodes.filter(element).filter(child => child.tagName === tag)[Number(position) - 1];
  }
  if (!current || !element(current) || current.namespaceURI !== HTML_NAMESPACE || NEVER_TEXT.has(current.tagName) || current.childNodes.length !== 1) return undefined;
  const child = current.childNodes[0]!;
  const location = child.sourceCodeLocation;
  const parentLocation = current.sourceCodeLocation;
  if (child.nodeName !== '#text' || !('value' in child) || child.value !== liveText || !location || !parentLocation?.startTag || !parentLocation.endTag || location.startOffset !== parentLocation.startTag.endOffset || location.endOffset !== parentLocation.endTag.startOffset) return undefined;
  return {domPath, text: liveText, start: location.startOffset, end: location.endOffset, literal: source.slice(location.startOffset, location.endOffset)};
}

export function replaceArtifactText(source: string, target: ArtifactTextMapping, newText: string): string | undefined {
  if (!validArtifactText(newText) || source.slice(target.start, target.end) !== target.literal) return undefined;
  const escaped = newText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const next = source.slice(0, target.start) + escaped + source.slice(target.end);
  return Buffer.byteLength(next) <= MAX_ARTIFACT_FILE_BYTES ? next : undefined;
}
