export type FrameReadScope = 'view' | 'page';

type FrameReadPlace = 'in' | 'partly' | 'below' | 'above' | 'aside';

interface FrameReadItem {
  depth: number;
  role: string;
  name: string;
  level?: number;
  ref: string;
  place: FrameReadPlace;
}

export interface FrameRead {
  url: string;
  width: number;
  height: number;
  scrollY: number;
  pageHeight: number;
  items: FrameReadItem[];
  truncated: boolean;
}

export interface RefExpectation {
  role: string;
  name: string;
}

export const FRAME_READ_PAGE_LINES = 400;
const PAGE_ITEM_CAP = 3000;
const NAME_LENGTH = 60;

const LEAF_ROLES = ['link', 'button', 'heading', 'img', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider', 'tab', 'menuitem', 'option'];
const CONTAINER_ROLES = ['banner', 'navigation', 'main', 'contentinfo', 'complementary', 'region', 'form', 'search', 'dialog', 'toolbar', 'tablist', 'menu', 'menubar'];
const CARD_ROLES = ['article', 'figure', 'video'];

/** Role, name, the box a clip frames and whether it is in view are computed the same way for a read and for a clip, so a plain line is always one a card can picture. */
const SHARED = String.raw`
  const state = globalThis.__studioFrameRead ??= { byRef: new Map(), byEl: new WeakMap(), next: 1 };
  const LEAVES = new Set(${JSON.stringify(LEAF_ROLES)});
  const CONTAINERS = new Set(${JSON.stringify(CONTAINER_ROLES)});
  const LISTED = new Set([...LEAVES, ...CONTAINERS, ...${JSON.stringify(CARD_ROLES)}]);
  const implicitRole = (el) => {
    const tag = el.localName;
    if (tag === 'a' || tag === 'area') return el.hasAttribute('href') ? 'link' : null;
    if (tag === 'button' || tag === 'summary') return 'button';
    if (tag === 'input') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (type === 'hidden') return null;
      if (type === 'search') return 'searchbox';
      if (type === 'checkbox' || type === 'radio') return type;
      if (type === 'range') return 'slider';
      if (['button', 'submit', 'reset', 'image'].includes(type)) return 'button';
      return 'textbox';
    }
    if (tag === 'textarea') return 'textbox';
    if (tag === 'select') return 'combobox';
    if (tag === 'img') return el.getAttribute('alt') ? 'img' : null;
    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (tag === 'nav') return 'navigation';
    if (tag === 'main') return 'main';
    if (tag === 'header') return el.closest('article,section,main,aside,nav') ? null : 'banner';
    if (tag === 'footer') return el.closest('article,section,main,aside,nav') ? null : 'contentinfo';
    if (tag === 'aside') return 'complementary';
    if (tag === 'section') return el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') ? 'region' : null;
    if (tag === 'form') return 'form';
    if (tag === 'search') return 'search';
    if (tag === 'dialog') return 'dialog';
    if (tag === 'article') return 'article';
    if (tag === 'figure') return 'figure';
    if (tag === 'video') return 'video';
    return null;
  };
  const roleOf = (el) => {
    const explicit = (el.getAttribute('role') || '').trim().split(/\s+/)[0];
    const role = explicit || implicitRole(el);
    return role && LISTED.has(role) ? role : null;
  };
  const clean = (text) => (text || '').replace(/\s+/g, ' ').trim();
  const labelled = (el) => {
    const ids = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    const root = el.getRootNode();
    return clean(ids.map((id) => (root.getElementById ? root.getElementById(id) : null) || document.getElementById(id)).map((node) => node ? node.innerText || node.textContent : '').join(' '));
  };
  const rawName = (el, role) => {
    const label = clean(el.getAttribute('aria-label'));
    if (label) return label;
    const by = labelled(el);
    if (by) return by;
    if (role === 'img') return clean(el.getAttribute('alt'));
    if (['textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider'].includes(role)) {
      return clean((el.labels && el.labels[0] && el.labels[0].innerText) || el.getAttribute('placeholder') || el.getAttribute('title'));
    }
    if (LEAVES.has(role)) {
      const text = clean(el.innerText || el.textContent);
      if (text) return text;
      const img = el.querySelector('img[alt]');
      if (img && clean(img.getAttribute('alt'))) return clean(img.getAttribute('alt'));
    }
    return clean(el.getAttribute('title'));
  };
  const nameOf = (el, role) => {
    const name = rawName(el, role).replace(/"/g, "'");
    return name.length > ${NAME_LENGTH} ? name.slice(0, ${NAME_LENGTH - 1}) + '…' : name;
  };
  const pictureBox = (el) => {
    const outer = el.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(el);
    const text = range.getBoundingClientRect();
    return text.width > 0 && text.height > 0 && text.width < outer.width * 0.6 ? text : outer;
  };
  const halfShown = (box) => {
    const shownWidth = Math.max(0, Math.min(box.x + box.width, innerWidth) - Math.max(box.x, 0));
    const shownHeight = Math.max(0, Math.min(box.y + box.height, innerHeight) - Math.max(box.y, 0));
    return box.width > 0 && box.height > 0 && shownWidth * shownHeight >= (box.width * box.height) / 2;
  };
`;

/** The read runs in Studio's isolated world, so refs live there for the document's life and a re-read hands out the same ones. */
export function frameReadScript(): string {
  return `(() => {${SHARED}
  const vw = innerWidth, vh = innerHeight;
  const placeOf = (el) => {
    const box = pictureBox(el);
    if (halfShown(box)) return 'in';
    if (box.y >= vh) return 'below';
    if (box.y + box.height <= 0) return 'above';
    if (box.x + box.width <= 0 || box.x >= vw) return 'aside';
    return 'partly';
  };
  const visible = (el, r) => {
    if (r.width < 2 || r.height < 2) return false;
    const style = getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0;
  };
  const items = [];
  let truncated = false;
  const children = (el) => [...(el.shadowRoot ? el.shadowRoot.children : []), ...el.children];
  const walk = (el, depth) => {
    for (const child of children(el)) {
      if (items.length >= ${PAGE_ITEM_CAP}) { truncated = true; return; }
      if (child.getAttribute('aria-hidden') === 'true' || child.inert || ['script', 'style', 'template', 'noscript', 'svg', 'head'].includes(child.localName)) continue;
      const role = roleOf(child);
      if (role === null) { walk(child, depth); continue; }
      const rect = child.getBoundingClientRect();
      const container = CONTAINERS.has(role);
      if (!visible(child, rect)) { if (container) walk(child, depth); continue; }
      let ref = state.byEl.get(child);
      if (ref === undefined) {
        ref = 'e' + state.next++;
        state.byEl.set(child, ref);
        state.byRef.set(ref, new WeakRef(child));
      }
      const item = { depth, role, name: nameOf(child, role), ref, place: placeOf(child) };
      if (role === 'heading') item.level = Number(child.getAttribute('aria-level')) || Number(child.localName.slice(1)) || 2;
      items.push(item);
      if (!LEAVES.has(role)) walk(child, depth + 1);
    }
  };
  if (document.body) walk(document.body, 0);
  return { url: location.href, width: vw, height: vh, scrollY: Math.round(scrollY), pageHeight: document.documentElement.scrollHeight, items, truncated };
})()`;
}

/** The clip's half of the ref check: a ref this world never handed out, or one whose element changed role or name, is stale. */
export const FRAME_REF_RESOLVE = `${SHARED}
  const resolveRef = (target) => {
    const held = state.byRef.get(target.ref);
    const el = held ? held.deref() : undefined;
    if (!el || !el.isConnected) return null;
    const role = roleOf(el);
    return role === target.role && nameOf(el, role) === target.name ? el : null;
  };
`;

const PLACES: readonly FrameReadPlace[] = ['in', 'partly', 'below', 'above', 'aside'];
const REF = /^e[1-9][0-9]*$/;

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function itemOf(value: unknown): FrameReadItem | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { depth, role, name, level, ref, place } = value as Record<string, unknown>;
  if (!finite(depth) || depth < 0 || typeof role !== 'string' || typeof name !== 'string' || typeof ref !== 'string' || !REF.test(ref)) return undefined;
  if (!(PLACES as readonly unknown[]).includes(place)) return undefined;
  const item: FrameReadItem = { depth: Math.floor(depth), role, name, ref, place: place as FrameReadPlace };
  return finite(level) ? { ...item, level } : item;
}

export function frameReadOf(value: unknown): FrameRead | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { url, width, height, scrollY, pageHeight, items, truncated } = value as Record<string, unknown>;
  if (typeof url !== 'string' || !finite(width) || !finite(height) || width <= 0 || height <= 0 || !Array.isArray(items)) return undefined;
  return {
    url,
    width,
    height,
    scrollY: finite(scrollY) ? scrollY : 0,
    pageHeight: finite(pageHeight) ? pageHeight : height,
    items: items.map(itemOf).filter((item): item is FrameReadItem => item !== undefined),
    truncated: truncated === true,
  };
}

const MARK: Record<FrameReadPlace, string> = { in: '', partly: ' [partly]', below: ' [below]', above: ' [above]', aside: ' [offscreen]' };

function lineOf(item: FrameReadItem): string {
  const name = item.name === '' ? '' : ` "${item.name}"`;
  const level = item.level === undefined ? '' : ` [level=${String(item.level)}]`;
  return `${'  '.repeat(item.depth)}- ${item.role}${name}${level} [ref=${item.ref}]${MARK[item.place]}`;
}

function plural(count: number, role: string): string {
  if (count === 1) return `1 ${role}`;
  return `${String(count)} ${role === 'search' ? 'searches' : role === 'img' ? 'images' : `${role}s`}`;
}

function countByRole(items: readonly FrameReadItem[]): string {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.role, (counts.get(item.role) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).map(([role, count]) => plural(count, role)).join(', ');
}

export function frameReadText(frameId: string, read: FrameRead, scope: FrameReadScope): string {
  const header =
    `Frame ${frameId} at ${read.url}: a ${String(Math.round(read.width))}x${String(Math.round(read.height))} viewport, ` +
    `scrolled ${String(read.scrollY)}px down a page ${String(read.pageHeight)}px tall.`;
  const shown = scope === 'view' ? read.items.filter((item) => item.place === 'in' || item.place === 'partly') : read.items;
  const listed = shown.slice(0, FRAME_READ_PAGE_LINES);
  const lines = [header, ...listed.map(lineOf)];
  if (listed.length === 0) lines.push('Nothing on this page has a role a card can picture: no links, buttons, headings, named images or landmarks.');
  if (shown.length > listed.length || read.truncated) {
    lines.push(`… and ${read.truncated ? 'more than ' : ''}${String(shown.length - listed.length)} more, not listed.`);
  }
  const out = read.items.filter((item) => item.place === 'below' || item.place === 'above' || item.place === 'aside');
  if (scope === 'view' && out.length > 0) {
    lines.push(`Out of view, not listed: ${countByRole(out)}. Scope "page" lists them; a card pictures only what is in view.`);
  }
  return lines.join('\n');
}

/** Refs main has handed the agent, per frame, so a clip can tell the page what the ref named when it was read. */
export class FrameRefBook {
  private readonly frames = new Map<string, Map<string, RefExpectation>>();

  constructor(private readonly perFrame = 5000) {}

  remember(key: string, read: FrameRead): void {
    const refs = this.frames.get(key) ?? new Map<string, RefExpectation>();
    for (const item of read.items) {
      refs.delete(item.ref);
      refs.set(item.ref, { role: item.role, name: item.name });
    }
    for (const oldest of refs.keys()) {
      if (refs.size <= this.perFrame) break;
      refs.delete(oldest);
    }
    this.frames.set(key, refs);
  }

  expectation(key: string, ref: string): RefExpectation | undefined {
    return this.frames.get(key)?.get(ref);
  }
}
