import { extname } from 'node:path';
import type { ArtifactFileBundle } from './adapter.js';
import { boundedFont, boundedRaster } from './assets.js';

export type ArtifactPrivacyIssue = 'machine-path' | 'local-url' | 'secret' | 'project-name';

const MACHINE_PATH = /(?:file:\/\/|(?:^|[\s"'`(=>:])(?:\/(?:Users|home|root|private|tmp|var|opt|etc|usr|mnt|srv|Volumes|Applications|Library|System)\/|(?:[a-z]:[\\/]|\\\\)(?=[^\u0000-\u001f\u007f\ufffd]))|~\/(?=[^\u0000-\u001f\u007f\ufffd]))/im;
const LOCAL_URL = /(?:https?|wss?):\/\/(?:[^/@\s]+@)?(?:localhost\b|127(?:\.\d{1,3}){3}\b|0\.0\.0\.0\b|10(?:\.\d{1,3}){3}\b|192\.168(?:\.\d{1,3}){2}\b|169\.254(?:\.\d{1,3}){2}\b|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}\b|\[(?:::1|f[cd][a-f\d:]*|fe80[a-f\d:]*)\])/i;
const SECRET = /(?:\b(?:sk-|ghp_|github_pat_|AKIA)[a-z\d_-]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:api[_-]?key|access[_-]?token|secret|password)\s*[=:]\s*["'][^"'\s]{12,}["'])/i;

function localAddress(url: string): boolean {
  let host: string;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return false; }
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (/^(?:127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0$|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)) return true;
  if (/^\[(?:::1|f[cd][a-f\d:]*|fe[89ab][a-f\d:]*)\]$/.test(host)) return true;
  const mapped = /^\[::ffff:([a-f\d]{1,4}):([a-f\d]{1,4})\]$/.exec(host);
  if (mapped !== null) {
    const first = Number.parseInt(mapped[1] ?? '', 16);
    const second = Number.parseInt(mapped[2] ?? '', 16);
    return localAddress(`http://${first >>> 8}.${first & 255}.${second >>> 8}.${second & 255}`);
  }
  return false;
}

export function artifactPrivacyIssues(bundle: ArtifactFileBundle, projectNames: readonly string[] = []): ArtifactPrivacyIssue[] {
  const found = new Set<ArtifactPrivacyIssue>();
  for (const file of bundle.files) {
    const bytes = Buffer.from(file.bytes);
    const extension = extname(file.path).toLowerCase();
    if ((['.png', '.jpg', '.jpeg'].includes(extension) && boundedRaster(bytes)) ||
        (['.woff', '.woff2'].includes(extension) && boundedFont(bytes))) continue;
    const text = bytes.toString('utf8').replace(/\\(?:u([\da-f]{4})|x([\da-f]{2}))/gi, (_match, unicode: string | undefined, hex: string | undefined) => String.fromCharCode(Number.parseInt(unicode ?? hex ?? '0', 16))).replace(/&#(?:x([\da-f]+)|(\d+));?/gi, (_match, hex: string | undefined, decimal: string | undefined) => {
      const point = Number.parseInt(hex ?? decimal ?? '0', hex === undefined ? 10 : 16);
      return point <= 0x10ffff ? String.fromCodePoint(point) : '';
    });
    if (MACHINE_PATH.test(text)) found.add('machine-path');
    const urls = Array.from(text.matchAll(/(?:https?|wss?):\/\/[^\s"'`<>]+/gi), (match) => match[0]);
    if (LOCAL_URL.test(text) || urls.some(localAddress)) found.add('local-url');
    if (SECRET.test(text)) found.add('secret');
    const references = [...urls, ...Array.from(text.matchAll(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g), (match) => match[0])];
    if (projectNames.some((name) => name.length >= 4 && references.some((reference) => reference.includes(name)))) found.add('project-name');
  }
  return [...found];
}
