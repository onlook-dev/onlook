import { describe, expect, it } from 'bun:test';
import { classifyAttachmentBytes, skillMentionRange, TEXT_ATTACHMENT_MAX_BYTES, withoutSkillMention } from './attachments.js';
import { IMAGE_MAX_BYTES } from './images.js';

const bytes = (text: string) => new TextEncoder().encode(text);
describe('chat attachment byte admission', () => {
  for (const source of ['<svg><path d="M12 37"/></svg>', '<html>cedar-731</html>', '# Brand\nJuniper', '{"privateCode":"pebble-981"}', '.header { color: #1a3c5f; }', 'name,value\nfern,739', 'Readable prose', 'export const badge = "tulip-43";']) {
    it(`accepts readable source independent of extension: ${source.slice(0, 15)}`, () => {
      for (const agent of ['claude', 'codex'] as const) expect(classifyAttachmentBytes(bytes(source), agent)).toEqual({ ok: true, mediaType: 'text/plain' });
    });
  }
  it('does not treat PDF bytes as text and refuses them on ChatGPT', () => {
    expect(classifyAttachmentBytes(bytes('%PDF-1.7\nsecret passage'), 'claude')).toEqual({ ok: true, mediaType: 'application/pdf' });
    expect(classifyAttachmentBytes(bytes('%PDF-1.7\nsecret passage'), 'codex')).toEqual({ ok: false, reason: 'pdf-unsupported' });
  });
  it('refuses empty, binary and invalid UTF-8 files', () => {
    expect(classifyAttachmentBytes(new Uint8Array(), 'claude')).toEqual({ ok: false, reason: 'unreadable' });
    expect(classifyAttachmentBytes(bytes('text\0binary'), 'claude')).toEqual({ ok: false, reason: 'unsupported-format' });
    expect(classifyAttachmentBytes(new Uint8Array([0xc3, 0x28]), 'codex')).toEqual({ ok: false, reason: 'unsupported-format' });
  });
  it('bounds text expansion separately from binary bytes', () => {
    expect(classifyAttachmentBytes(bytes('a'.repeat(TEXT_ATTACHMENT_MAX_BYTES)), 'claude').ok).toBe(true);
    expect(classifyAttachmentBytes(bytes('a'.repeat(TEXT_ATTACHMENT_MAX_BYTES + 1)), 'claude')).toEqual({ ok: false, reason: 'text-too-large' });
    expect(classifyAttachmentBytes(new Uint8Array(IMAGE_MAX_BYTES + 1), 'claude')).toEqual({ ok: false, reason: 'too-large' });
  });
  it('keeps raster admission on both agents', () => {
    const raster = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    for (const agent of ['claude', 'codex'] as const) expect(classifyAttachmentBytes(raster, agent)).toEqual({ ok: true, mediaType: 'image/png' });
  });
});

describe('a skill mention in its prompt', () => {
  it('is found where it was typed, as its own word', () => {
    expect(skillMentionRange('make the hero pop /bayesian and keep spacing', 'bayesian')).toEqual({ start: 18, end: 27 });
    expect(skillMentionRange('/bayesian first', 'bayesian')).toEqual({ start: 0, end: 9 });
    expect(skillMentionRange('ends with\u00A0/bayesian', 'bayesian')).toEqual({ start: 10, end: 19 });
  });
  it('is not a prefix of a longer word, nor a path', () => {
    expect(skillMentionRange('try /bayesian-two now', 'bayesian')).toBeUndefined();
    expect(skillMentionRange('see a/bayesian', 'bayesian')).toBeUndefined();
  });
  it('treats a name with regex characters literally', () => {
    expect(skillMentionRange('run /ux.copy now', 'ux.copy')).toEqual({ start: 4, end: 12 });
    expect(skillMentionRange('run /uxacopy now', 'ux.copy')).toBeUndefined();
  });
  it('comes out with one neighbouring space, so the sentence closes up', () => {
    expect(withoutSkillMention('make the hero pop /bayesian and keep spacing', 'bayesian')).toBe('make the hero pop and keep spacing');
    expect(withoutSkillMention('/bayesian\u00A0first', 'bayesian')).toBe('first');
    expect(withoutSkillMention('last /bayesian', 'bayesian')).toBe('last');
    expect(withoutSkillMention('no mention', 'bayesian')).toBe('no mention');
  });
});
