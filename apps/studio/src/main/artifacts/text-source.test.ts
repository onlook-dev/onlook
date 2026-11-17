import { expect, it } from 'bun:test';
import { ARTIFACT_TEXT_MAX_LENGTH } from '@studio/events';
import { mapArtifactText, replaceArtifactText } from './text-source.js';

const path = (index = 1) => `html:nth-of-type(1)>body:nth-of-type(1)>p:nth-of-type(${index})`;

it('distinguishes identical labels by full DOM path and preserves every surrounding byte', () => {
  const source = '<!doctype html>\r\n<html><head></head><body>\r\n<p data-id="one">A &amp; B</p><p>A &amp; B</p>\r\n</body></html>';
  const mapped = mapArtifactText(source, path(2), 'A & B');
  expect(mapped).toBeDefined();
  expect(replaceArtifactText(source, mapped!, '<strong>"new" & safe</strong>')).toBe(source.replace('<p>A &amp; B</p>', '<p>&lt;strong&gt;"new" &amp; safe&lt;/strong&gt;</p>'));
});

it('normalizes HTML entities and newlines without serializing the document', () => {
  const source = '<p>&#x1f680;\r\n&amp;</p>';
  const mapped = mapArtifactText(source, path(), '🚀\n&');
  expect(mapped).toBeDefined();
  expect(replaceArtifactText(source, mapped!, 'Next\nline')).toBe('<p>Next\nline</p>');
});

it('fails closed for generated, calculated, mixed, malformed and sensitive targets', () => {
  for (const source of [
    '<p>Hello <b>world</b></p>', '<p>Hello<!--comment--></p>', '<p>Hello',
    '<p>Different</p>', '<script>document.body.innerHTML = "<p>Hello</p>"</script>',
    '<p>Hello</p><script>const p = document.createElement("p"); p.textContent = String(1+1); document.querySelector("p").replaceWith(p)</script>',
    '<p>Hello</p><div ONCLICK="run()"></div>', '<p>Hello</p><a href="java&#x09;script:run()">Link</a>',
    '<p>Hello</p><template><script>run()</script></template>', '<p>Hello</p><svg><a href="javascript:run()"></a></svg>',
    '<p>Hello</p><iframe srcdoc="<script>run()</script>"></iframe>', '<p>Hello</p><div contenteditable></div>',
  ]) expect(mapArtifactText(source, path(), 'Hello')).toBeUndefined();
  expect(mapArtifactText('<p>2</p><script>const p=document.createElement("p"); p.textContent=String(1+1); document.querySelector("p").replaceWith(p)</script>', path(), '2')).toBeUndefined();
  expect(mapArtifactText('<textarea>Hello</textarea>', path().replace('p:nth', 'textarea:nth'), 'Hello')).toBeUndefined();
});

it('rejects malformed paths, oversized payloads and stale ranges', () => {
  for (const domPath of ['', 'p', path(0), path(-1), path(2), `${path()}>b:nth-of-type(1)`, path().replace('(1)', '(01)'), 'x'.repeat(2049)]) {
    expect(mapArtifactText('<p>Hello</p>', domPath, 'Hello')).toBeUndefined();
  }
  const source = '<p>Hello</p>';
  const mapped = mapArtifactText(source, path(), 'Hello')!;
  expect(replaceArtifactText('<p>Other</p>', mapped, 'Next')).toBeUndefined();
  expect(replaceArtifactText(source, mapped, 'x'.repeat(ARTIFACT_TEXT_MAX_LENGTH + 1))).toBeUndefined();
  expect(replaceArtifactText(source, mapped, '\u0000')).toBeUndefined();
  expect(replaceArtifactText(source, mapped, '\ud800')).toBeUndefined();
});
