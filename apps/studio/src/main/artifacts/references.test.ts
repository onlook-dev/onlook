import { expect, it } from 'bun:test';
import { artifactReferences, rewriteArtifactReferences } from './references.js';

it('rewrites only actual markup/style references, never lookalike script text or data attributes', () => {
  const html = '<!-- <img src="ignored.png"> --><img data-src="not-a-reference" src="url.png" style="background:url(url.png)"><script>const label=\'src="url.png"\';</script><style>body{background:url("url.png")}</style>';
  const refs = artifactReferences(html, '.html');
  expect(refs.map((ref) => html.slice(ref.start, ref.end))).toEqual(['url.png', 'url.png', 'url.png']);
  const rewritten = rewriteArtifactReferences(html, refs.map((reference) => ({ reference, value: '../assets/safe.png' })));
  expect(rewritten).toContain('data-src="not-a-reference"');
  expect(rewritten).toContain('const label=\'src="url.png"\'');
  expect(rewritten).toContain('url("../assets/safe.png")');
});

it('refuses unsupported module/network dependencies before promising portability', () => {
  for (const script of ['import("./module.js")', 'fetch("/api")', 'new WebSocket("wss://example.invalid")']) expect(() => artifactReferences(script, '.js')).toThrow();
  expect(() => artifactReferences('<script type="module">let count=0;</script>', '.html')).toThrow();
  expect(artifactReferences('@import "theme.css";', '.css').map((reference) => reference.value)).toEqual(['theme.css']);
});

it.each(['ws', 'rows', 'news', 'wss', 'http', 'https', 'profile', 'myfile'])('allows %s property keys and labels in standalone and inline scripts', (key) => {
  const script = `const team = { ${key}: ['marketing-site'] }; ${key}: for (const space of team.${key}) { break ${key}; }`;
  expect(artifactReferences(script, '.js')).toEqual([]);
  expect(artifactReferences(`<script>${script}</script>`, '.html')).toEqual([]);
});

it.each(['http://', 'https://', 'ws://', 'wss://', 'studio-artifact://', 'file:', 'file:/', 'file://', 'file:///', 'WSS://', 'FILE:'])('still refuses %s references in standalone and inline scripts', (scheme) => {
  const script = `const address = '${scheme}example.invalid/resource';`;
  expect(() => artifactReferences(script, '.js')).toThrow('unsupported script dependency');
  expect(() => artifactReferences(`<script>${script}</script>`, '.html')).toThrow('unsupported script dependency');
});

it.each([String.raw`\b`, String.raw`\f`, String.raw`\n`, String.raw`\r`, String.raw`\t`, String.raw`\v`, String.raw`\0`, String.raw`\040`, String.raw`\12`, String.raw`\x20`, String.raw`\u0020`, String.raw`\u{20}`])('still refuses file references after escaped whitespace %s', (prefix) => {
  const script = `const address = '${prefix}file:///example.invalid/resource';`;
  expect(() => artifactReferences(script, '.js')).toThrow('unsupported script dependency');
  expect(() => artifactReferences(`<script>${script}</script>`, '.html')).toThrow('unsupported script dependency');
});
