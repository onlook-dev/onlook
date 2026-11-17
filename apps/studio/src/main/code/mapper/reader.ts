import type { ComponentReading } from '@studio/events';

export function readerSource(selector: string): string {
  // `document` is passed IN, never referenced as a global: main's lib has no
  // DOM, and the sibling guest script takes it the same way.
  return `(${READER.toString()})(document, ${JSON.stringify(selector)})`;
}

/** Structural, so this module stays typeable without the DOM lib. */
interface PageDocument {
  querySelector(selector: string): unknown;
}

/* eslint-disable */
const READER = function (doc: PageDocument, selector: string): unknown {
  function fiberOf(node: unknown): unknown {
    if (node === null || typeof node !== 'object') return null;
    for (const key of Object.keys(node as Record<string, unknown>)) {
      if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
        return (node as Record<string, unknown>)[key];
      }
    }
    return null;
  }

  function nameOf(type: unknown): string | null {
    if (typeof type === 'function') {
      const fn = type as { displayName?: unknown; name?: unknown };
      if (typeof fn.displayName === 'string' && fn.displayName) return fn.displayName;
      if (typeof fn.name === 'string' && fn.name) return fn.name;
      return null;
    }
    if (type !== null && typeof type === 'object') {
      const wrapper = type as { displayName?: unknown; render?: unknown; type?: unknown; _payload?: unknown };
      if (typeof wrapper.displayName === 'string' && wrapper.displayName) return wrapper.displayName;
      // memo(), forwardRef() and lazy() each hold the real component one level down.
      if (wrapper.render !== undefined) return nameOf(wrapper.render);
      if (wrapper.type !== undefined) return nameOf(wrapper.type);
      if (wrapper._payload !== undefined) return nameOf(wrapper._payload);
    }
    return null;
  }

  function framesOf(fiber: Record<string, unknown>): string[] {
    const source = fiber['_debugSource'];
    if (source !== null && typeof source === 'object') {
      const where = source as { fileName?: unknown; lineNumber?: unknown; columnNumber?: unknown };
      if (typeof where.fileName === 'string' && where.fileName.length > 0
        && typeof where.lineNumber === 'number' && Number.isInteger(where.lineNumber) && where.lineNumber > 0
        && typeof where.columnNumber === 'number' && Number.isInteger(where.columnNumber) && where.columnNumber > 0) {
        return ['at ' + where.fileName + ':' + String(where.lineNumber) + ':' + String(where.columnNumber)];
      }
    }
    const stack = fiber['_debugStack'];
    if (typeof stack === 'string') return stack.split('\n');
    if (stack !== null && typeof stack === 'object') {
      const asError = stack as { stack?: unknown };
      if (typeof asError.stack === 'string') return asError.stack.split('\n');
    }
    return [];
  }

  function creationOf(fiber: Record<string, unknown>): string {
    return framesOf(fiber).slice(0, 32).map(function (frame) { return frame.slice(0, 500); }).join('\n');
  }

  function repetitionsOf(fiber: Record<string, unknown>): { count: number; complete: boolean } {
    let source = fiber;
    for (let depth = 0; creationOf(source) === '' && source['return'] != null && depth < 64; depth += 1) {
      source = source['return'] as Record<string, unknown>;
    }
    const creation = creationOf(source);
    const sourceFrames = framesOf(source);
    if (creation === '' || sourceFrames.length > 32 || sourceFrames.some(function (frame) { return frame.length > 500; })) return { count: 1, complete: false };
    let root = source;
    for (let depth = 0; root['return'] != null && depth < 64; depth += 1) {
      root = root['return'] as Record<string, unknown>;
    }
    const pending = [root];
    const visited = new Set<Record<string, unknown>>();
    let complete = root['return'] == null && source === fiber;
    let count = 0;
    while (pending.length > 0 && visited.size < 512) {
      const current = pending.pop() as Record<string, unknown>;
      if (visited.has(current)) { complete = false; continue; }
      visited.add(current);
      if (current['type'] === source['type']) {
        const frames = framesOf(current);
        if (frames.length === 0 || frames.length > 32 || frames.some(function (frame) { return frame.length > 500; })) complete = false;
        else if (creationOf(current) === creation) count += 1;
      }
      if (current['sibling'] != null) pending.push(current['sibling'] as Record<string, unknown>);
      if (current['child'] != null) pending.push(current['child'] as Record<string, unknown>);
    }
    if (!visited.has(source)) count += 1;
    return { count: Math.max(1, count), complete: complete && pending.length === 0 };
  }

  function buildOf(fiber: Record<string, unknown>): string {
    const own = Object.prototype.hasOwnProperty;
    return own.call(fiber, '_debugOwner') || own.call(fiber, '_debugStack') ? 'development' : 'production';
  }

  try {
    const node = doc.querySelector(selector);
    if (node === null) return { ok: false, why: 'no-element' };
    let fiber = fiberOf(node) as Record<string, unknown> | null;
    const element = node as { tagName?: unknown; getAttribute?: (name: string) => string | null; textContent?: unknown };
    const evidence = {
      tag: typeof element.tagName === 'string' ? element.tagName.toLowerCase().slice(0, 64) : '',
      classes: (element.getAttribute?.('class') ?? '').split(/\s+/).filter(Boolean).slice(0, 8).map(function (name) { return name.slice(0, 100); }),
      text: typeof element.textContent === 'string' ? element.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : '',
    };
    if (fiber === null) return { ok: true, react: 'none', component: null, frames: [], ownerFrames: [], siblings: 1, siblingsComplete: false, evidence: evidence };
    const react = buildOf(fiber);
    const direct = typeof fiber['type'] === 'string' && framesOf(fiber).length > 0;

    const siblings = repetitionsOf(fiber);
    let component: string | null = null;
    const stacks: string[][] = [];
    let hops = 0;
    while (fiber !== null && hops < 64 && stacks.length < 4) {
      const own = framesOf(fiber);
      if (own.length > 0) stacks.push(own);
      if (component === null) {
        const named = nameOf(fiber['elementType'] ?? fiber['type']);
        if (named !== null && typeof fiber['type'] !== 'string') component = named;
      }
      fiber = (fiber['return'] ?? null) as Record<string, unknown> | null;
      hops += 1;
    }
    const own = stacks.length === 0 ? [] : stacks[0];
    const above: string[] = [];
    for (let at = 1; at < stacks.length; at += 1) {
      for (const frame of stacks[at] as string[]) above.push(frame);
    }
    const bound = function (frames: string[]): string[] {
      return frames.slice(0, 32).map(function (frame) {
        return String(frame).slice(0, 500);
      });
    };
    // Bounded: this crosses from an untrusted page and is parsed again in main.
    return {
      ok: true,
      component: component === null ? null : component.slice(0, 200),
      frames: bound(own as string[]),
      direct: direct,
      ownerFrames: bound(above),
      siblings: siblings.count,
      siblingsComplete: siblings.complete,
      react: react,
      evidence: evidence,
    };
  } catch (error) {
    return { ok: false, why: 'threw', detail: String(error).slice(0, 200) };
  }
};
/* eslint-enable */

/** The page's answer, parsed at the boundary with exact keys and bounded strings: it crosses from an untrusted realm (ONL-2563). */
export function readingOf(value: unknown): ComponentReading {
  if (value === null || typeof value !== 'object') return { ok: false, why: 'unreadable' };
  const answer = value as Record<string, unknown>;
  if (answer['ok'] !== true) {
    const why = answer['why'];
    return { ok: false, why: why === 'no-element' || why === 'no-react' ? why : 'unreadable' };
  }
  const component = answer['component'];
  const siblings = answer['siblings'];
  const react = answer['react'];
  const rawEvidence = answer['evidence'];
  const evidence = rawEvidence !== null && typeof rawEvidence === 'object' ? rawEvidence as Record<string, unknown> : null;
  const bound = (value: unknown): readonly string[] =>
    Array.isArray(value)
      ? value.filter((frame): frame is string => typeof frame === 'string').slice(0, 32).map((frame) => frame.slice(0, 500))
      : [];
  return {
    ok: true,
    // Anything but the page's own word for a development build is treated as one Studio cannot read.
    react: react === 'development' || react === 'production' ? react : 'none',
    component: typeof component === 'string' && component.length > 0 ? component.slice(0, 200) : null,
    frames: bound(answer['frames']),
    direct: answer['direct'] === true,
    ownerFrames: bound(answer['ownerFrames']),
    siblings:
      typeof siblings === 'number' && Number.isInteger(siblings) && siblings > 0
        ? Math.min(siblings, 10_000)
        : 1,
    siblingsComplete: answer['siblingsComplete'] === true && typeof siblings === 'number' && Number.isInteger(siblings) && siblings > 0 && siblings <= 10_000,
    ...(evidence === null ? {} : { evidence: {
      tag: typeof evidence['tag'] === 'string' && /^[a-z][a-z0-9-]*$/.test(evidence['tag']) ? evidence['tag'].slice(0, 64) : '',
      classes: Array.isArray(evidence['classes']) ? evidence['classes'].filter((value): value is string => typeof value === 'string').slice(0, 8).map((value) => value.slice(0, 100)) : [],
      text: typeof evidence['text'] === 'string' ? evidence['text'].replace(/\s+/g, ' ').trim().slice(0, 120) : '',
    } }),
  };
}
