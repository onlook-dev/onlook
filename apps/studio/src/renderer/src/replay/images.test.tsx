import { afterAll, afterEach, expect, test } from 'bun:test';
import '../testing/dom.js';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { record, EventType, takeFullSnapshot, type eventWithTime } from 'posthog-js/rrweb';
import { ImageThumbnail } from '@studio/chat-ui';
import { FrameIdleThumbnail } from '../canvas/frame/FrameIdleThumbnail.js';
import { ImagePreview } from '../code/ImagePreview.js';
import { replayInitPlan } from './derive.js';

const recording = replayInitPlan({
  enabled: true,
  key: 'phc_test',
  host: 'http://localhost',
  distinctId: 'image-privacy-test',
  isIdentified: false,
  identityRevision: 0,
  sessionId: '01920000-0000-7000-8000-000000000001',
})!.options.session_recording!;

const dataImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=';
const blobImage = 'blob:http://localhost/private-chat-screenshot';
let stop: (() => void) | undefined;
let root: Root | undefined;
const host = document.createElement('main');
document.body.append(host);
const userAgent = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent');
Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: 'Safari' });

afterAll(() => {
  if (userAgent) Object.defineProperty(window.navigator, 'userAgent', userAgent);
  else Reflect.deleteProperty(window.navigator, 'userAgent');
  for (const realm of document.querySelectorAll('iframe[__rrwebUntaintedPrototype]')) realm.remove();
});

afterEach(async () => {
  stop?.();
  stop = undefined;
  if (root) await act(() => { root?.unmount(); });
  root = undefined;
  host.replaceChildren();
});

function start(blockSelector = recording.blockSelector): eventWithTime[] {
  const events: eventWithTime[] = [];
  stop = record({
    emit: (event) => { events.push(event); },
    blockSelector: blockSelector ?? undefined,
    maskTextSelector: recording.maskTextSelector ?? undefined,
    maskAllInputs: recording.maskAllInputs,
    recordCanvas: recording.captureCanvas?.recordCanvas ?? undefined,
    inlineStylesheet: false,
    recordAfter: 'DOMContentLoaded',
    errorHandler: (error) => { throw error; },
  });
  expect(stop).toBeFunction();
  document.dispatchEvent(new Event('DOMContentLoaded'));
  takeFullSnapshot();
  expect(events.some((event) => event.type === EventType.FullSnapshot)).toBe(true);
  return events;
}

test('the pinned recorder exposes data pixels and blob references when images are not blocked', () => {
  host.innerHTML = `<img src="${dataImage}"><img src="${blobImage}">`;
  const events = start('[data-replay-block]');
  const payload = JSON.stringify(events);
  expect(payload).toContain(dataImage);
  expect(payload).toContain(blobImage);
});

test('replay omits image sources and metadata without hiding surrounding controls', () => {
  host.innerHTML = `<button data-replay-witness="visible-control">Send</button><img src="${dataImage}" srcset="${dataImage} 2x" alt="private-repo.png" title="private page"><img src="${blobImage}"><img src="https://example.test/private-page.png"><section data-replay-block><span data-private-source="blocked-subtree">private subtree</span></section>`;
  const payload = JSON.stringify(start());
  expect(payload).not.toContain(dataImage);
  expect(payload).not.toContain(blobImage);
  expect(payload).not.toContain('private-repo');
  expect(payload).not.toContain('private page');
  expect(payload).not.toContain('private-page');
  expect(payload).not.toContain('private subtree');
  expect(payload).not.toContain('blocked-subtree');
  expect(payload).toContain('visible-control');
  expect(payload).toContain('button');
  expect(payload).toContain('rr_width');
});

test('replay omits idle Frame and code preview images rendered by production components', () => {
  host.innerHTML = renderToStaticMarkup(<>
    <FrameIdleThumbnail thumbnail={dataImage} />
    <ImagePreview path="private-repo.png" dataUrl={dataImage} bytes={32} />
  </>);
  expect(document.querySelectorAll('img')).toHaveLength(2);
  expect(JSON.stringify(start())).not.toContain(dataImage);
});

test('replay omits a Project Chat image that resolves after recording starts', async () => {
  const container = document.createElement('div');
  host.append(container);
  root = createRoot(container);
  const events = start();
  await act(async () => {
    root?.render(<ImageThumbnail
      image={{ id: 'image-1', mediaType: 'image/png', width: 8, height: 8 }}
      resolve={async () => blobImage}
      alt="private screenshot"
      unavailableLabel="Image unavailable"
    />);
  });
  await new Promise((resolve) => setTimeout(resolve, 25));
  expect(document.querySelector('img')?.getAttribute('src')).toBe(blobImage);
  expect(events.some((event) => event.type === EventType.IncrementalSnapshot)).toBe(true);
  const payload = JSON.stringify(events);
  expect(payload).toContain('"tagName":"img"');
  expect(payload).not.toContain(blobImage);
  expect(payload).not.toContain('private screenshot');
});

test('replay omits later image source and responsive source mutations', async () => {
  host.innerHTML = `<img src="${blobImage}">`;
  const events = start();
  const image = document.querySelector('img')!;
  image.src = dataImage;
  image.srcset = `${dataImage} 2x`;
  const witness = document.createElement('button');
  witness.dataset['mutationWitness'] = 'source-updated';
  host.append(witness);
  await new Promise((resolve) => setTimeout(resolve, 25));
  expect(image.src).toBe(dataImage);
  expect(JSON.stringify(events)).toContain('source-updated');
  expect(JSON.stringify(events)).not.toContain(dataImage);
  expect(JSON.stringify(events)).not.toContain(blobImage);
});
