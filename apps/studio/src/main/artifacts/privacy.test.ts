import { describe, expect, it } from 'bun:test';
import { artifactPrivacyIssues } from './privacy.js';

const scan = (text: string, projectNames: string[] = []) => artifactPrivacyIssues({ pages: [], files: [{ path: 'pages/index.html', bytes: Buffer.from(text) }] }, projectNames);

describe('portable artifacts do not reveal machine-local addresses', () => {
  it('flags machine paths and secret categories without flagging style hashes or data URIs', () => {
    for (const path of ['/Users/designer/private', '/opt/company/private', 'C:\\Users\\designer\\private', '\\\\server\\private', '~/private', 'file:///tmp/private']) expect(scan(`<p>${path}</p>`), path).toContain('machine-path');
    expect(scan('api_key="sk-123456789012345678901234"')).toContain('secret');
    expect(scan('<div class="css-a8f30d6e55d05ac8334347334da222aa"></div><img src="data:image/png;base64,abcdefgh1234567890">')).not.toContain('secret');
  });
  it('passes site-relative links, regex literals and comments while refusing machine roots', () => {
    for (const text of ['<a href="/pricing/">Pricing</a>', '<script>s.replace(/-/g, " ")</script>', '// see /docs/ for details', '<img src="/images/hero.png">']) {
      expect(scan(text), text).not.toContain('machine-path');
    }
    for (const path of ['/home/fixture/project', '/Users/x/y', '/private/var/folders/x', '/tmp/build/out', '/Volumes/Work/site']) {
      expect(scan(`<a href="${path}">x</a>`), path).toContain('machine-path');
    }
  });
  it('does not invent a machine path from isolated compressed-asset prefix bytes', () => {
    const bytes = Uint8Array.from([0, 255, 126, 47, 0, 40, 92, 92, 255, 0]);
    expect(artifactPrivacyIssues({ pages: [], files: [{ path: 'assets/font.woff2', bytes }] })).toEqual([]);
    expect(artifactPrivacyIssues({ pages: [], files: [{ path: 'assets/font.woff2', bytes: Buffer.from('\u0000~/private/project\u0000') }] })).toContain('machine-path');
  });
  it('never interprets opaque image and font bytes as private text', () => {
    const payload = Buffer.from('\u0000\ufffd~/photo\n\\\\pixels\nC:\\font\nhttp://localhost:3000\n');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVxkAAAAASUVORK5CYII=', 'base64');
    const jpeg = Buffer.from([255, 216, 255, 192, 0, 8, 8, 0, 1, 0, 1, 0]);
    for (const extension of ['woff', 'woff2', 'png', 'jpg', 'jpeg']) {
      const header = extension === 'png' ? png : extension.startsWith('jp') ? jpeg : Buffer.alloc(48);
      const bytes = Buffer.concat([header, payload]);
      if (extension.startsWith('woff')) {
        bytes.write(extension === 'woff' ? 'wOFF' : 'wOF2');
        bytes.writeUInt32BE(bytes.length, 8);
        bytes.writeUInt16BE(1, 12);
        bytes.writeUInt32BE(1024, 16);
      }
      expect(artifactPrivacyIssues({ pages: [], files: [{ path: `assets/test.${extension}`, bytes }] })).toEqual([]);
    }
  });
  it('does not trust binary filenames for text containing private details', () => {
    for (const extension of ['png', 'jpg', 'jpeg', 'woff', 'woff2', 'gif', 'webp', 'ico', 'ttf', 'avif']) {
      for (const [text, issue] of [['/Users/designer/private', 'machine-path'], ['http://localhost:3000', 'local-url'], ['password="example-not-a-real-credential"', 'secret']] as const) {
        expect(artifactPrivacyIssues({ pages: [], files: [{ path: `assets/test.${extension}`, bytes: Buffer.from(text) }] })).toContain(issue);
      }
    }
  });
  it('keeps scanning every text format, including SVG and escaped details', () => {
    for (const extension of ['html', 'css', 'js', 'mjs', 'json', 'svg']) {
      for (const [text, issue] of [['/Users/designer/private', 'machine-path'], ['~/private', 'machine-path'], ['C:\\private\\file', 'machine-path'], ['http://localhost:3000', 'local-url'], ['password="example-not-a-real-credential"', 'secret'], ['&#126;/private', 'machine-path']] as const) {
        expect(artifactPrivacyIssues({ pages: [], files: [{ path: `pages/test.${extension}`, bytes: Buffer.from(text) }] })).toContain(issue);
      }
    }
  });
  it('retains paths with international and space-starting components', () => {
    for (const path of ['~/设计/private', '~/ private/project', 'C:\\设计\\private', 'C:\\ private\\project', '\\\\公司\\share', '\\\\ company\\share']) {
      expect(scan(`<p>${path}</p>`), path).toContain('machine-path');
    }
  });
  it('recognizes canonical, abbreviated, encoded and mapped loopback URLs', () => {
    for (const host of ['localhost', '127.0.0.1', '127.1', '2130706433', '[::1]', '[::ffff:127.0.0.1]', 'app.localhost', 'printer.local', '10.1.2.3', '[fc00::1]']) {
      expect(scan(`<a href="http://${host}/private">Link</a>`), host).toContain('local-url');
    }
  });
  it('flags project names in references and comments but not a user-written heading', () => {
    expect(scan('<a href="https://example.invalid/private-project/page">Link</a>', ['private-project'])).toContain('project-name');
    expect(scan('<!-- private-project -->', ['private-project'])).toContain('project-name');
    expect(scan('<h1>private-project</h1>', ['private-project'])).not.toContain('project-name');
  });
});
