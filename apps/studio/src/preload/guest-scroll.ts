import {
  parseFrameScrollCommand,
  type FrameScrollMetrics,
  type FrameScrollReport,
} from '@studio/events';
import { isPickerNode, mutationTouchesPage } from './guest-mutations.js';

function permitsScroll(overflow: string): boolean {
  return overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay';
}

export function visibleScrollArea(element: Element, view: Window): number {
  const rect = element.getBoundingClientRect();
  let left = Math.max(0, rect.left);
  let top = Math.max(0, rect.top);
  let right = Math.min(view.innerWidth, rect.right);
  let bottom = Math.min(view.innerHeight, rect.bottom);
  for (let ancestor: Element | null = element; ancestor !== null; ancestor = ancestor.parentElement) {
    const style = view.getComputedStyle(ancestor);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || style.contentVisibility === 'hidden') return 0;
    if (ancestor === element) continue;
    const bounds = ancestor.getBoundingClientRect();
    const overflowX = style.overflowX || style.overflow;
    const overflowY = style.overflowY || style.overflow;
    if (overflowX !== 'visible' && overflowX !== '') {
      left = Math.max(left, bounds.left);
      right = Math.min(right, bounds.right);
    }
    if (overflowY !== 'visible' && overflowY !== '') {
      top = Math.max(top, bounds.top);
      bottom = Math.min(bottom, bounds.bottom);
    }
  }
  return Math.max(0, right - left) * Math.max(0, bottom - top);
}

/** Unchanged frames the follow loop waits out: a slow transition moves an integer scroll height only every few frames. */
const QUIET_FRAMES = 8;

/** Measured frames between whole-document scans while a surface still serves: a page mutating every frame would otherwise scan every frame. */
const SCAN_FRAMES = 12;

/** Ends as well as starts: an end event catches growth too slow to move the scroll height every frame. */
const ANIMATION_EVENTS = [
  'transitionrun', 'transitionstart', 'transitionend', 'transitioncancel',
  'animationstart', 'animationend', 'animationcancel',
] as const;

function scrollable(element: Element): boolean {
  return element.isConnected && element.clientHeight > 0 && element.scrollHeight > element.clientHeight + 1;
}

/** The viewport takes the root's overflow, and body's only while the root's is visible (ONL-2793). */
function viewportOverflowY(doc: Document, view: Window): string {
  const root = view.getComputedStyle(doc.documentElement).overflowY;
  if (root !== '' && root !== 'visible') return root;
  return doc.body === null ? 'visible' : view.getComputedStyle(doc.body).overflowY;
}

function discoverScrollSurface(doc: Document, view: Window): { target: Element | null; candidates: Element[] } {
  const root = doc.scrollingElement;
  const viewport = viewportOverflowY(doc, view);
  const locked = viewport === 'hidden' || viewport === 'clip';
  if (root !== null && !locked && scrollable(root)) return { target: root, candidates: [] };
  let largest: Element | null = null;
  let largestArea = 0;
  const candidates: Element[] = [];
  for (const element of doc.querySelectorAll('*')) {
    if (element === root || isPickerNode(element) || element.clientHeight <= 0 ||
      !permitsScroll(view.getComputedStyle(element).overflowY)) continue;
    const area = visibleScrollArea(element, view);
    if (area <= 0) continue;
    candidates.push(element);
    if (scrollable(element) && area > largestArea) {
      largest = element;
      largestArea = area;
    }
  }
  return { target: largest, candidates };
}

export function findScrollSurface(doc: Document, view: Window): Element | null {
  return discoverScrollSurface(doc, view).target;
}

export function createGuestScrollController(
  doc: Document,
  view: Window,
  report: (message: FrameScrollReport) => void,
  reflow: () => void,
  // The page is the user's own: a throw while reading it must reach the owner, not stop the loop silently (ONL-2348).
  guard: <Args extends unknown[]>(handler: (...args: Args) => void) => (...args: Args) => void,
): { receive(value: unknown): void; dispose(): void } {
  let session = 0;
  let surfaceVersion = 0;
  let target: Element | null = null;
  let candidates: Element[] = [];
  let frame: number | null = null;
  let pump: number | null = null;
  let tail = 0;
  let rescanned = false;
  let discover = false;
  let waited = 0;
  let previous: string | null = null;
  let stop: (() => void) | null = null;
  let resize: ResizeObserver | null = null;
  const observed = new Set<Element>();

  const schedule = (rediscover: boolean) => {
    discover ||= rediscover;
    if (session === 0 || frame !== null || pump !== null) return;
    frame = view.requestAnimationFrame(flush);
  };

  const observeSize = () => {
    const elements = new Set<Element>([doc.documentElement]);
    if (doc.body !== null) elements.add(doc.body);
    for (const surface of target === null ? candidates : [target, ...candidates]) {
      elements.add(surface);
      for (const child of surface.children) if (!isPickerNode(child)) elements.add(child);
    }
    for (const element of observed) {
      if (!elements.has(element)) {
        resize?.unobserve(element);
        observed.delete(element);
      }
    }
    for (const element of elements) {
      if (!observed.has(element)) {
        resize?.observe(element);
        observed.add(element);
      }
    }
  };

  const measure = () => {
    if (session === 0) return;
    if (discover) {
      if (target !== null && scrollable(target) && waited < SCAN_FRAMES) {
        waited += 1;
        schedule(false);
      } else {
        discover = false;
        waited = 0;
        const next = discoverScrollSurface(doc, view);
        if (next.target !== target) surfaceVersion += 1;
        target = next.target;
        candidates = next.candidates;
        observeSize();
      }
    }
    let metrics: FrameScrollMetrics | null = null;
    if (target !== null && target.isConnected && target.scrollHeight > target.clientHeight + 1) {
      metrics = {
        session,
        surface: surfaceVersion,
        top: Math.max(0, Math.min(target.scrollTop, target.scrollHeight - target.clientHeight)),
        viewport: target.clientHeight,
        height: target.scrollHeight,
      };
    }
    const signature = JSON.stringify(metrics);
    if (signature !== previous) {
      previous = signature;
      report({ session, metrics });
      reflow();
    }
  };

  const flush = guard(() => {
    frame = null;
    measure();
  });

  const latent = (): boolean => {
    const root = doc.scrollingElement;
    return candidates.some(scrollable) || (root !== null && scrollable(root));
  };

  // Growth from a transition below the observed children fires no mutation and no observed resize, so
  // an animation event starts a per-frame measure and a surface that stops changing ends it (ONL-2793).
  const follow = guard(() => {
    pump = null;
    if (session === 0) return;
    if (target === null && !rescanned && frame === null && latent()) {
      rescanned = true;
      discover = true;
    }
    const before = previous;
    measure();
    tail = previous === before ? tail - 1 : QUIET_FRAMES;
    if (tail > 0) pump = view.requestAnimationFrame(follow);
  });

  const kick = () => {
    tail = QUIET_FRAMES;
    if (session === 0 || pump !== null) return;
    // One rescan per burst: a page whose growth no surface can serve would otherwise scan per frame.
    rescanned = false;
    // The pump measures every frame, so a coalescing frame alongside it would only measure twice.
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = null;
    pump = view.requestAnimationFrame(follow);
  };

  const onAnimation = guard((event: Event) => {
    const node = event.target;
    if (node instanceof Node && isPickerNode(node)) return;
    kick();
  });

  const dispose = () => {
    stop?.();
    stop = null;
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = null;
    if (pump !== null) view.cancelAnimationFrame(pump);
    pump = null;
    tail = 0;
    rescanned = false;
    waited = 0;
    session = 0;
    target = null;
    candidates = [];
    previous = null;
    discover = false;
  };

  const observe = (nextSession: number) => {
    dispose();
    session = nextSession;
    const onScroll = guard((event: Event) => {
      schedule(event.target !== target && !(target === doc.scrollingElement && event.target === doc));
    });
    const onResize = guard(() => schedule(true));
    const mutations = new MutationObserver(guard((records: MutationRecord[]) => {
      if (records.some((mutation) => mutationTouchesPage(mutation, isPickerNode))) schedule(true);
    }));
    mutations.observe(doc.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    resize = new ResizeObserver(onResize);
    doc.addEventListener('scroll', onScroll, true);
    view.addEventListener('resize', onResize);
    doc.addEventListener('load', onResize, true);
    for (const name of ANIMATION_EVENTS) doc.addEventListener(name, onAnimation, true);
    doc.fonts?.addEventListener('loadingdone', onResize);
    doc.fonts?.addEventListener('loadingerror', onResize);
    stop = () => {
      mutations.disconnect();
      resize?.disconnect();
      resize = null;
      observed.clear();
      doc.removeEventListener('scroll', onScroll, true);
      view.removeEventListener('resize', onResize);
      doc.removeEventListener('load', onResize, true);
      for (const name of ANIMATION_EVENTS) doc.removeEventListener(name, onAnimation, true);
      doc.fonts?.removeEventListener('loadingdone', onResize);
      doc.fonts?.removeEventListener('loadingerror', onResize);
    };
    schedule(true);
  };

  return {
    receive(value) {
      const command = parseFrameScrollCommand(value);
      if (command === null) return;
      if (command.type === 'observe') {
        if (command.enabled) observe(command.session);
        else if (command.session === session) dispose();
        return;
      }
      if (command.session !== session || command.surface !== surfaceVersion || target === null) return;
      if (command.type === 'scrollBy') target.scrollBy({ top: command.delta, behavior: 'instant' });
      else target.scrollTo({ top: Math.min(command.top, target.scrollHeight - target.clientHeight), behavior: 'instant' });
      schedule(false);
    },
    dispose,
  };
}
