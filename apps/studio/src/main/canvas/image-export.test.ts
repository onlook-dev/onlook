import { describe, expect, it } from 'bun:test';
import { createImageExportHandler, ImageCaptureError, imageExportName, type ImageExportTarget } from './image-export.js';
import { t } from '@studio/i18n';

function bench() {
  const writes: { path: string; bytes: Uint8Array }[] = [];
  const choices: string[] = [];
  const formats: string[] = [];
  let admitted = true;
  let current = true;
  let chosen: string | undefined = '/exports/Design.png';
  let captures = 0;
  const target: ImageExportTarget = {
    title: 'Design / Q4', width: 800, height: 600,
    current: async () => current,
    capture: async format => { captures += 1; formats.push(format); return new Uint8Array([1, 2, 3]); },
  };
  const handler = createImageExportHandler({
    admitted: () => admitted,
    target: async () => target,
    choose: async name => { choices.push(name); return chosen; },
    write: (path, bytes) => { writes.push({ path, bytes }); },
  });
  return { handler, target, writes, choices, formats, captures: () => captures, admit: (value: boolean) => { admitted = value; }, current: (value: boolean) => { current = value; }, choose: (value: string | undefined) => { chosen = value; } };
}

describe('image export', () => {
  it('reports the specific capture failure and recovers for the next export', async () => {
    const test = bench();
    for (const [reason, key] of [['resolution', 'canvas.export.resolution'], ['timeout', 'canvas.export.timeout'], ['too-large', 'canvas.export.tooLarge'], ['unavailable', 'canvas.export.unavailable']] as const) {
      test.target.capture = async () => { throw new ImageCaptureError(reason); };
      expect(await test.handler({}, { nodeId: 'frame', format: 'png' })).toEqual({ outcome: 'refused', reason: t(key) });
    }
    expect(test.choices).toEqual([]);
    test.target.capture = async () => new Uint8Array([1]);
    expect((await test.handler({}, { nodeId: 'frame', format: 'png' })).outcome).toBe('saved');
  });

  it('distinguishes a destination write failure from a failed frame capture', async () => {
    const test = bench();
    const handler = createImageExportHandler({
      admitted: () => true, target: async () => test.target, choose: async () => '/unwritable/image.png',
      write: () => { throw new Error('EACCES'); },
    });
    expect(await handler({}, { nodeId: 'frame', format: 'png' })).toEqual({ outcome: 'refused', reason: t('canvas.export.writeFailed') });
  });

  it('names PNG 1x, true 2x PNG and JPEG without paths or punctuation', () => {
    expect(imageExportName('../Q4: Design!', 'png')).toBe('Q4 Design.png');
    expect(imageExportName('Q4 Design', 'png-2x')).toBe('Q4 Design@2x.png');
    expect(imageExportName('日本語', 'jpeg')).toBe('日本語.jpg');
    expect(imageExportName('...', 'png')).toBe('frame.png');
  });

  for (const format of ['png', 'jpeg'] as const) {
    it(`passes ${format} to the renderer and saves captured bytes once`, async () => {
      const test = bench();
      expect(await test.handler({}, { nodeId: 'frame', format })).toEqual({ outcome: 'saved', name: 'Design.png', location: '/exports/Design.png' });
      expect(test.formats).toEqual([format]);
      expect(test.writes).toEqual([{ path: '/exports/Design.png', bytes: new Uint8Array([1, 2, 3]) }]);
      expect(test.choices).toEqual([imageExportName(test.target.title, format)]);
    });
  }

  it('rejects foreign senders and invalid formats before capture or a save sheet', async () => {
    const test = bench();
    test.admit(false);
    expect((await test.handler({}, { nodeId: 'frame', format: 'png' })).outcome).toBe('refused');
    test.admit(true);
    expect((await test.handler({}, { nodeId: 'frame', format: 'html' as never })).outcome).toBe('refused');
    expect(test.captures()).toBe(0);
    expect(test.choices).toEqual([]);
  });

  it('does not save a guest that changed while capturing', async () => {
    const test = bench();
    test.target.capture = async () => { test.current(false); return new Uint8Array([1]); };
    expect((await test.handler({}, { nodeId: 'frame', format: 'png' })).outcome).toBe('refused');
    expect(test.choices).toEqual([]);
    expect(test.writes).toEqual([]);
  });

  it('refuses unsupported live-frame 2x and checks dimensions before allocating pixels', async () => {
    const test = bench();
    expect((await test.handler({}, { nodeId: 'frame', format: 'png-2x' as never })).outcome).toBe('refused');
    expect(test.captures()).toBe(0);
    test.target.width = 8000;
    test.target.height = 6000;
    expect((await test.handler({}, { nodeId: 'frame', format: 'png' })).outcome).toBe('refused');
    for (const width of [NaN, Infinity, 0, -1, 20000]) {
      test.target.width = width;
      expect((await test.handler({}, { nodeId: 'frame', format: 'png' })).outcome).toBe('refused');
    }
  });

  it('treats a cancelled save sheet as cancellation without writing', async () => {
    const test = bench();
    test.choose(undefined);
    expect(await test.handler({}, { nodeId: 'frame', format: 'png' })).toEqual({ outcome: 'cancelled' });
    expect(test.writes).toEqual([]);
  });

  it('rechecks ownership after the save sheet before writing', async () => {
    let valid = true;
    let wrote = false;
    const handler = createImageExportHandler({
      admitted: () => valid,
      target: async () => ({ title: 'A', width: 10, height: 10, current: async () => valid, capture: async () => new Uint8Array([1]) }),
      choose: async () => { valid = false; return '/export.png'; },
      write: () => { wrote = true; },
    });
    expect((await handler({}, { nodeId: 'frame', format: 'png' })).outcome).toBe('refused');
    expect(wrote).toBe(false);
  });

  it('recovers from a failed capture and reports empty images', async () => {
    const test = bench();
    test.target.capture = async () => { throw new Error('guest destroyed'); };
    expect((await test.handler({}, { nodeId: 'frame', format: 'png' })).outcome).toBe('refused');
    test.target.capture = async () => new Uint8Array();
    expect((await test.handler({}, { nodeId: 'frame', format: 'png' })).outcome).toBe('refused');
    expect(test.writes).toEqual([]);
  });

  it('rechecks the target after the save sheet with admission still valid and disposes it', async () => {
    let current = true;
    let disposed = false;
    let wrote = false;
    const handler = createImageExportHandler({
      admitted: () => true,
      target: async () => ({ title: 'A', width: 10, height: 10, current: async () => current, capture: async () => new Uint8Array([1]), dispose: () => { disposed = true; } }),
      choose: async () => { current = false; return '/export.png'; },
      write: () => { wrote = true; },
    });
    expect((await handler({}, { nodeId: 'frame', format: 'png' })).outcome).toBe('refused');
    expect(wrote).toBe(false);
    expect(disposed).toBe(true);
  });
});
