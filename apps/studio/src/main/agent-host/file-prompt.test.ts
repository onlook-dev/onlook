import { describe, expect, it } from 'bun:test';
import { buildPromptContent, buildAppServerInput, splitAttachments, type ResolvedAttachment } from './prompt-content.js';
import { t } from '@studio/i18n';

const file: ResolvedAttachment = { id: 'attached-1', name: 'brand.html', bytes: new TextEncoder().encode('<h1>iris-752</h1>'), mediaType: 'text/plain' };
describe('file delivery and skill invocation', () => {
  it('delivers discriminating text and filename to both agents as untrusted data', () => {
    const claude = buildPromptContent('Read this', [file]);
    const codex = buildAppServerInput('Read this', [file]);
    expect(JSON.stringify(claude)).toContain('iris-752');
    expect(JSON.stringify(codex)).toContain('iris-752');
    expect(JSON.stringify(claude)).toContain('brand.html');
    expect(JSON.stringify(codex)).toContain('save_attachment');
    expect(JSON.stringify(claude)).not.toContain('<h1>');
    expect(codex.every((input) => input.type === 'text')).toBe(true);
  });
  it('sends PDFs as documents and never silently drops one on Codex', () => {
    const pdf: ResolvedAttachment = { id: 'attached-pdf', name: 'guidelines.pdf', mediaType: 'application/pdf', bytes: new TextEncoder().encode('%PDF-1.7\norchid-923') };
    const blocks = buildPromptContent('Read it', [pdf]);
    if (typeof blocks === 'string') throw new Error('missing document');
    expect(blocks.at(-1)).toEqual({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: Buffer.from(pdf.bytes).toString('base64') } });
    expect(() => buildAppServerInput('Read it', [pdf])).toThrow(t('chat.attach.pdfUnavailable'));
  });
  it('invokes the selected skill through each agent’s supported mechanism', () => {
    const claude = { kind: 'skill' as const, name: 'brand:apply', description: 'Use the brand', agent: 'claude' as const };
    const codex = { ...claude, agent: 'codex' as const, path: '/skills/brand/SKILL.md' };
    expect(buildPromptContent('make a header', [], [], [claude])).toBe('/brand:apply make a header');
    expect(buildAppServerInput('make a header', [], [], [codex])).toEqual([{ type: 'text', text: 'make a header' }, { type: 'skill', name: 'brand:apply', path: '/skills/brand/SKILL.md' }]);
    expect(() => buildAppServerInput('make a header', [], [], [claude])).toThrow(t('chat.skills.stale'));
    const split = splitAttachments([{ kind: 'file', id: file.id!, name: file.name!, mediaType: 'text/plain', originalSize: file.bytes.byteLength }, claude]);
    expect(split.images).toEqual([]);
    expect(split.files).toHaveLength(1);
    expect(split.skills).toEqual([claude]);
  });
  it('keeps document blocks before the trailing raster image blocks', () => {
    const pdf: ResolvedAttachment = { mediaType: 'application/pdf', bytes: new TextEncoder().encode('%PDF-1.7\nsecret') };
    const skill = { kind: 'skill' as const, name: 'brand:apply', description: 'Use the brand', agent: 'claude' as const };
    const image: ResolvedAttachment = { mediaType: 'image/png', bytes: new Uint8Array([1, 2, 3]) };
    const blocks = buildPromptContent('Quote the passage', [image, pdf], [], [skill]);
    if (typeof blocks === 'string') throw new Error('missing PDF blocks');
    expect(blocks[0]?.type).toBe('text');
    expect(JSON.stringify(blocks[0])).toContain('/brand:apply');
    expect(blocks[1]?.type).toBe('document');
    expect(blocks[2]?.type).toBe('image');
  });
});
