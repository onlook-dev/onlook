import { afterEach, beforeEach, expect, test } from 'bun:test';
import type { ReportSubmitOutcome, ReportSubmitRequest } from '@studio/events';
import { chooseReportImage, removeReportImage, openReport, resetReportForTesting, setReportDraft, sendReport, useReportStore } from './store.js';

const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64');
const oldBitmap = globalThis.createImageBitmap;

beforeEach(() => {
  resetReportForTesting();
  openReport('menu', 'bug');
  setReportDraft('The canvas moved');
  useReportStore.setState({ imageCapable: true });
  globalThis.createImageBitmap = (async () => ({ width: 1, height: 1, close() {} })) as unknown as typeof createImageBitmap;
});

afterEach(() => {
  resetReportForTesting();
  globalThis.createImageBitmap = oldBitmap;
});

test('picking and removing an image creates and clears a preview without retaining a path', async () => {
  await chooseReportImage(new File([bytes], 'private-project.png', { type: 'image/png' }));
  const image = useReportStore.getState().image;
  expect(image?.preview.startsWith('blob:')).toBe(true);
  expect(image).not.toHaveProperty('name');
  removeReportImage();
  expect(useReportStore.getState().image).toBeUndefined();
});

test('an over-limit selection has a clear error before a preview is made', async () => {
  await chooseReportImage(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }));
  expect(useReportStore.getState().imageError).toBe('image-too-large');
  expect(useReportStore.getState().image).toBeUndefined();
});

test('failed cloud sends retain the image and draft for a retry, then release the image on filing', async () => {
  await chooseReportImage(new File([bytes], 'screen.png', { type: 'image/png' }));
  const image = useReportStore.getState().image;
  let answer: ReportSubmitOutcome = { kind: 'refused', reason: 'send-failed' };
  const submits: ReportSubmitRequest[] = [];
  Object.assign(globalThis, { window: { studio: { reportSubmit: async (request: ReportSubmitRequest) => { submits.push(request); return answer; } } } });
  sendReport();
  await Promise.resolve();
  expect(useReportStore.getState().status.kind).toBe('composing');
  expect(useReportStore.getState().image).toBe(image);
  expect(useReportStore.getState().draft).toBe('The canvas moved');
  expect(useReportStore.getState().sendError).toBe('send-failed');
  expect(submits[0]?.image).not.toHaveProperty('preview');
  answer = { kind: 'filed' };
  sendReport();
  await Promise.resolve();
  expect(useReportStore.getState().status).toStrictEqual({ kind: 'closed' });
  expect(useReportStore.getState().image).toBeUndefined();
});

test('a removed image cannot return from a pending decode', async () => {
  let finish: (() => void) | undefined;
  globalThis.createImageBitmap = (() => new Promise((resolve) => { finish = () => resolve({ width: 1, height: 1, close() {} } as ImageBitmap); })) as typeof createImageBitmap;
  const selecting = chooseReportImage(new File([bytes], 'screen.png', { type: 'image/png' }));
  for (let attempt = 0; attempt < 10 && finish === undefined; attempt += 1) await Promise.resolve();
  expect(finish).toBeDefined();
  removeReportImage();
  finish?.();
  await selecting;
  expect(useReportStore.getState().image).toBeUndefined();
  expect(useReportStore.getState().imageBusy).toBe(false);
});

test('removing the image keeps the warning that a send may already have landed', async () => {
  await chooseReportImage(new File([bytes], 'screen.png', { type: 'image/png' }));
  Object.assign(globalThis, { window: { studio: { reportSubmit: async () => ({ kind: 'refused', reason: 'delivery-unknown' }) } } });
  sendReport();
  await Promise.resolve();
  removeReportImage();
  expect(useReportStore.getState().image).toBeUndefined();
  expect(useReportStore.getState().sendError).toBe('delivery-unknown');
});

test('removing the image clears a refusal the image itself caused', async () => {
  await chooseReportImage(new File([bytes], 'screen.png', { type: 'image/png' }));
  Object.assign(globalThis, { window: { studio: { reportSubmit: async () => ({ kind: 'refused', reason: 'image-unreadable' }) } } });
  sendReport();
  await Promise.resolve();
  removeReportImage();
  expect(useReportStore.getState().sendError).toBeUndefined();
});

test('builds without the capability cannot select an image', async () => {
  useReportStore.setState({ imageCapable: false });
  await chooseReportImage(new File([bytes], 'screen.png', { type: 'image/png' }));
  expect(useReportStore.getState().image).toBeUndefined();
});

test('decoded dimensions are bounded even when the header appears small', async () => {
  globalThis.createImageBitmap = (async () => ({ width: 8193, height: 1, close() {} })) as unknown as typeof createImageBitmap;
  await chooseReportImage(new File([bytes], 'screen.png', { type: 'image/png' }));
  expect(useReportStore.getState().imageError).toBe('image-dimensions');
});

test('uncertain delivery retains the draft and image and states the uncertainty', async () => {
  await chooseReportImage(new File([bytes], 'screen.png', { type: 'image/png' }));
  const image = useReportStore.getState().image;
  Object.assign(globalThis, { window: { studio: { reportSubmit: async () => ({ kind: 'refused', reason: 'delivery-unknown' }) } } });
  sendReport();
  await Promise.resolve();
  expect(useReportStore.getState().sendError).toBe('delivery-unknown');
  expect(useReportStore.getState().status.kind).toBe('composing');
  expect(useReportStore.getState().image).toBe(image);
});
