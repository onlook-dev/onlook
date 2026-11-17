import { EVIDENCE_DOM_PATH_MAX, EVIDENCE_PATH_DEPTH_MAX, type ComponentBoundary } from '@studio/events';

/** Past this a page is a wall of boxes and the map stops being a hint; the reader stops walking. */
export const COMPONENT_MAP_MAX = 2_000;

export function componentMapSource(): string {
  return `(${MAP_READER.toString()})(document, ${String(EVIDENCE_PATH_DEPTH_MAX)}, ${String(EVIDENCE_DOM_PATH_MAX)})`;
}

interface PageDocument {
  querySelectorAll(selector: string): ArrayLike<unknown>;
}

/* eslint-disable */
const MAP_READER = function (doc: PageDocument, depthMax: number, pathMax: number): unknown {
  var LIMIT = 2000;

  function fiberOf(node: unknown): Record<string, unknown> | null {
    if (node === null || typeof node !== 'object') return null;
    for (var key of Object.keys(node as Record<string, unknown>)) {
      if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
        return (node as Record<string, unknown>)[key] as Record<string, unknown>;
      }
    }
    return null;
  }

  function nameOf(type: unknown): string | null {
    if (typeof type === 'function') {
      var fn = type as { displayName?: unknown; name?: unknown };
      if (typeof fn.displayName === 'string' && fn.displayName) return fn.displayName;
      if (typeof fn.name === 'string' && fn.name) return fn.name;
      return null;
    }
    if (type !== null && typeof type === 'object') {
      var wrapper = type as { displayName?: unknown; render?: unknown; type?: unknown };
      if (typeof wrapper.displayName === 'string' && wrapper.displayName) return wrapper.displayName;
      if (wrapper.render !== undefined) return nameOf(wrapper.render);
      if (wrapper.type !== undefined) return nameOf(wrapper.type);
    }
    return null;
  }

  // The same spelling element evidence carries, so a path from here matches a path from there.
  function pathOf(node: unknown): string | null {
    var segments: string[] = [];
    var at = node as { tagName?: string; parentElement?: unknown } | null;
    var hops = 0;
    while (at !== null && at !== undefined && typeof at.tagName === 'string' && hops < depthMax) {
      hops += 1;
      var tag = at.tagName.toLowerCase();
      var parent = at.parentElement as { children?: ArrayLike<{ tagName?: string }> } | null;
      if (parent === null || parent === undefined || parent.children === undefined) {
        segments.unshift(tag);
        break;
      }
      var index = 1;
      for (var i = 0; i < parent.children.length; i += 1) {
        var sibling = parent.children[i];
        if (sibling === (at as unknown)) break;
        if (sibling && sibling.tagName === at.tagName) index += 1;
      }
      segments.unshift(tag + ':nth-of-type(' + String(index) + ')');
      at = parent as typeof at;
    }
    if (segments.length === 0) return null;
    // Dropped from the HEAD, as the guest drops them: the element's own segment is the one that matters.
    var joined = segments.join(' > ');
    while (segments.length > 1 && joined.length > pathMax) {
      segments.shift();
      joined = segments.join(' > ');
    }
    return joined.length > pathMax ? joined.slice(joined.length - pathMax) : joined;
  }

  function isDevFiber(fiber: Record<string, unknown>): boolean {
    var own = Object.prototype.hasOwnProperty;
    return own.call(fiber, '_debugOwner') || own.call(fiber, '_debugStack');
  }

  function instanceRootName(fiber: Record<string, unknown>): string | null {
    var at = fiber['return'] as Record<string, unknown> | null | undefined;
    var hops = 0;
    while (at !== null && at !== undefined && hops < 64) {
      hops += 1;
      if (typeof at['type'] === 'string') return null;
      var named = nameOf(at['elementType'] ?? at['type']);
      if (named !== null) return named;
      at = at['return'] as Record<string, unknown> | null | undefined;
    }
    return null;
  }

  try {
    var all = (doc as { querySelectorAll(selector: string): ArrayLike<unknown> }).querySelectorAll('*');
    var found: { domPath: string; component: string }[] = [];
    var sawFiber = false;
    for (var index = 0; index < all.length && found.length < LIMIT; index += 1) {
      var element = all[index];
      var fiber = fiberOf(element);
      if (fiber === null) continue;
      sawFiber = true;
      // The first fiber on the page decides: nothing below is read from a production build.
      if (!isDevFiber(fiber)) return { ok: true, boundaries: [], react: 'production' };
      var name = instanceRootName(fiber);
      if (name === null) continue;
      var path = pathOf(element);
      if (path === null) continue;
      found.push({ domPath: path, component: name.slice(0, 200) });
    }
    return { ok: true, boundaries: found, react: sawFiber ? 'development' : 'none' };
  } catch (error) {
    return { ok: false, why: 'threw', detail: String(error).slice(0, 200) };
  }
};
/* eslint-enable */

/** The page's answer, parsed at the boundary: it crosses from an untrusted realm (ONL-2563). */
export function boundariesOf(value: unknown): ComponentBoundary[] {
  if (value === null || typeof value !== 'object') return [];
  const answer = value as Record<string, unknown>;
  if (answer['ok'] !== true || !Array.isArray(answer['boundaries'])) return [];
  const out: ComponentBoundary[] = [];
  for (const row of (answer['boundaries'] as unknown[]).slice(0, COMPONENT_MAP_MAX)) {
    if (row === null || typeof row !== 'object') continue;
    const entry = row as Record<string, unknown>;
    const domPath = entry['domPath'];
    const component = entry['component'];
    if (typeof domPath !== 'string' || domPath.length === 0) continue;
    if (typeof component !== 'string' || component.length === 0) continue;
    out.push({ domPath: domPath.slice(0, 2048), component: component.slice(0, 200) });
  }
  return out;
}
