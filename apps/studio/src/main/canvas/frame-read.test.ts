import { afterEach, describe, expect, it } from 'bun:test';
import { Window } from 'happy-dom';
import { clipReadScript, type ClipTarget } from './clip.js';
import { FRAME_READ_PAGE_LINES, FrameRefBook, frameReadOf, frameReadScript, frameReadText, type FrameRead } from './frame-read.js';

interface PageElement {
  textContent: string | null;
  remove(): void;
  insertAdjacentHTML(position: string, html: string): void;
}

type Page = {
  eval(code: string): unknown;
  document: { body: { innerHTML: string }; querySelector(selector: string): PageElement | null };
  happyDOM: { close(): Promise<void> };
};

const opened: Page[] = [];

/** happy-dom lays nothing out, so each element's box comes from its `data-y` and `data-h`. */
function page(body: string): Page {
  const window = new Window({ url: 'http://localhost:3000/', width: 1000, height: 800 }) as unknown as Page & Record<string, unknown>;
  window.document.body.innerHTML = body;
  const elements = window['HTMLElement'] as { prototype: { getBoundingClientRect(): unknown } };
  elements.prototype.getBoundingClientRect = function (this: { dataset: Record<string, string | undefined> }) {
    const y = Number(this.dataset['y'] ?? 0);
    const height = Number(this.dataset['h'] ?? 40);
    return { x: 0, y, left: 0, top: y, width: 200, height, right: 200, bottom: y + height };
  };
  window['getComputedStyle'] = () => ({ opacity: '1', display: 'block', visibility: 'visible' });
  opened.push(window);
  return window;
}

afterEach(async () => {
  for (const window of opened.splice(0)) await window.happyDOM.close();
});

const read = (window: Page): FrameRead => {
  const value = frameReadOf(window.eval(frameReadScript()));
  if (value === undefined) throw new Error('the read answered nothing usable');
  return value;
};

const gallery = `
  <header><nav><a href="/">Home</a><a href="/about">About</a></nav><input type="search" placeholder="Search"></header>
  <main data-h="2000">
    <h1>Collections</h1>
    <a href="/c/1" data-y="100"><img src="a.png" alt=""><h3>Onboarding flows</h3><p>12 screens</p></a>
    <a href="/c/2" data-y="300"><h3>Checkout flows</h3></a>
    <a href="/c/3" data-y="900"><h3>Paywall flows</h3></a>
    <button data-y="1200">Load more</button>
  </main>`;

describe('reading a frame as elements with refs', () => {
  it('lists what is in view by role and name, nothing inside a link, and counts what is below', () => {
    const text = frameReadText('f1', read(page(gallery)), 'view');
    expect(text).toContain('- link "Onboarding flows 12 screens" [ref=e');
    expect(text).toContain('- searchbox "Search" [ref=e');
    expect(text).not.toContain('heading "Onboarding flows"');
    expect(text).not.toContain('Paywall');
    expect(text).toContain('Out of view, not listed: 1 link, 1 button.');
  });

  it('lists the whole page with what is out of view marked, when asked', () => {
    const text = frameReadText('f1', read(page(gallery)), 'page');
    expect(text).toMatch(/- link "Paywall flows" \[ref=e\d+\] \[below\]/);
    expect(text).not.toContain('Out of view');
  });

  it('hands out the same refs when the same document is read again', () => {
    const window = page(gallery);
    const first = read(window).items.map(({ ref, name }) => `${ref}:${name}`);
    window.document.querySelector('main')?.insertAdjacentHTML('afterbegin', '<a href="/new">New</a>');
    const again = read(window).items.map(({ ref, name }) => `${ref}:${name}`);
    expect(again.filter((entry) => first.includes(entry))).toEqual(first);
  });

  it('stops listing at the line cap and says how many it left out', () => {
    const links = Array.from({ length: FRAME_READ_PAGE_LINES + 5 }, (_, index) => `<a href="/${String(index)}">Link ${String(index)}</a>`).join('');
    const lines = frameReadText('f1', read(page(`<div>${links}</div>`)), 'page').split('\n');
    expect(lines).toHaveLength(FRAME_READ_PAGE_LINES + 2);
    expect(lines.at(-1)).toBe('… and 5 more, not listed.');
  });

  it('drops an item the page answered with no usable ref', () => {
    const answered = { url: 'http://localhost/', width: 800, height: 600, items: [{ depth: 0, role: 'link', name: 'x', ref: 'e1; alert(1)', place: 'in' }] };
    expect(frameReadOf(answered)?.items).toEqual([]);
  });
});

describe('a clip trusts a ref only while it names what it named when read', () => {
  const clipRead = async (window: Page, targets: ClipTarget[]): Promise<unknown[]> =>
    ((await window.eval(clipReadScript(targets))) as { targets: unknown[] }).targets;

  it('finds the element a ref named, and calls the ref stale once its name changed', async () => {
    const window = page(gallery);
    const checkout = read(window).items.find((item) => item.name === 'Checkout flows');
    if (checkout === undefined) throw new Error('the read missed the checkout card');
    const expect_ = { role: checkout.role, name: checkout.name };
    expect(await clipRead(window, [{ ref: checkout.ref, expect: expect_ }])).toEqual([{ rect: { x: 0, y: 300, width: 200, height: 40 }, visible: true, inView: true }]);
    const heading = window.document.querySelector('a[href="/c/2"] h3');
    if (heading !== null) heading.textContent = 'Something else';
    expect(await clipRead(window, [{ ref: checkout.ref, expect: expect_ }])).toEqual([{ stale: true }]);
  });

  it('lists a line as plainly in view only when a clip of it would be in view, containers included', async () => {
    const window = page(`
      <section aria-label="Collections" data-h="3900">
        <a href="/c/1" data-y="100">Onboarding flows</a>
        <a href="/c/2" data-y="790">Checkout flows</a>
        <a href="/c/3" data-y="780">Profile flows</a>
      </section>`);
    const answer = read(window);
    const { items } = answer;
    expect(frameReadText('f1', answer, 'view')).toMatch(/- region "Collections" \[ref=e\d+\] \[partly\]/);
    const clipped = await clipRead(window, items.map((item) => ({ ref: item.ref, expect: { role: item.role, name: item.name } })));
    const pictured = clipped.map((found) => (found as { inView?: boolean }).inView === true);
    expect(items.map((item) => item.place === 'in')).toEqual(pictured);
    expect(pictured).toEqual([false, true, false, true]);
  });

  it('calls a ref stale when main never handed it out, or its element left the page', async () => {
    const window = page(gallery);
    const home = read(window).items.find((item) => item.name === 'Home');
    if (home === undefined) throw new Error('the read missed the home link');
    expect(await clipRead(window, [{ ref: home.ref, expect: null }])).toEqual([{ stale: true }]);
    window.document.querySelector('a[href="/"]')?.remove();
    expect(await clipRead(window, [{ ref: home.ref, expect: { role: home.role, name: home.name } }])).toEqual([{ stale: true }]);
  });
});

describe('the refs main remembers per frame', () => {
  const readOf = (refs: [string, string][]): FrameRead => ({
    url: 'http://localhost/',
    width: 800,
    height: 600,
    scrollY: 0,
    pageHeight: 600,
    truncated: false,
    items: refs.map(([ref, name]) => ({ depth: 0, role: 'link', name, ref, place: 'in' as const })),
  });

  it('answers what a ref named on that frame, and nothing for another frame', () => {
    const book = new FrameRefBook();
    book.remember('doc:f1', readOf([['e1', 'Home']]));
    expect(book.expectation('doc:f1', 'e1')).toEqual({ role: 'link', name: 'Home' });
    expect(book.expectation('doc:f2', 'e1')).toBeUndefined();
  });

  it('forgets the refs read longest ago once a frame holds too many', () => {
    const book = new FrameRefBook(2);
    book.remember('doc:f1', readOf([['e1', 'A'], ['e2', 'B']]));
    book.remember('doc:f1', readOf([['e3', 'C']]));
    expect([book.expectation('doc:f1', 'e1'), book.expectation('doc:f1', 'e3')]).toEqual([undefined, { role: 'link', name: 'C' }]);
  });
});
