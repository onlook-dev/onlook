/** ⚠️ NO IMPORTS: an import loads this with the bundle it exists to cover, so the build refuses one (`studio-boot-ground`). Its facts ride the birth query (ONL-3153). */

export const BOOT_GROUND_ID = 'boot-ground';

/** `REGION.rail`: the icon rail sits outside the saved sidebar width (ONL-2563). */
const RAIL = 60;

/** Literal fallbacks because the dev server injects `styles.css` from the bundle this runs ahead of; the tokens are `theme/studio.css`. */
const GROUND = 'var(--studio-ground, #262626)';
const SURFACE = 'var(--color-background-surface, #000000D9)';
const EDGE = 'var(--border-width, 0.5px) solid var(--color-border, #494949)';

function element(document: Document, testId: string, css: string): HTMLElement {
  const node = document.createElement('div');
  node.dataset['testid'] = testId;
  node.style.cssText = css;
  return node;
}

function rail(document: Document, width: number, side: 'left' | 'right'): HTMLElement {
  return element(
    document,
    `boot-rail-${side}`,
    `flex:0 0 ${String(width)}px;height:100%;background:${SURFACE};border-${side === 'left' ? 'right' : 'left'}:${EDGE}`,
  );
}

/** `ParkedScreen` in plain DOM: the same ground and rails, from birth facts alone (ONL-2318). */
export function paintBootGround(document: Document, panels: { sidebar: number; end: number }): HTMLElement {
  const ground = element(document, BOOT_GROUND_ID, `position:fixed;inset:0;display:flex;background:${GROUND}`);
  ground.id = BOOT_GROUND_ID;
  ground.setAttribute('aria-hidden', 'true');
  ground.append(
    rail(document, RAIL + panels.sidebar, 'left'),
    element(document, 'boot-canvas', 'flex:1 1 auto;min-width:0'),
    rail(document, panels.end, 'right'),
  );
  document.body.append(ground);
  return ground;
}

/**
 * Two frames after React's first commit has drawn over it, the same wait `tabPresented` takes (ONL-2744).
 * ⚠️ Never while hidden: a warmed Tab draws its first commit off screen, where `requestAnimationFrame` is
 * throttled, and a lift queued there runs seconds late — over the content it was covering for (ONL-3153).
 */
export function liftWhenRendered(ground: HTMLElement, root: Element): void {
  const lift = (): void => {
    if (document.visibilityState !== 'visible') {
      document.addEventListener('visibilitychange', lift, { once: true });
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => ground.remove()));
  };
  const observer = new MutationObserver(() => {
    if (root.childElementCount === 0) return;
    observer.disconnect();
    lift();
  });
  observer.observe(root, { childList: true });
}

/** The birth query's own reading, for the no-imports rule above; a tab whose widths are unreadable waits for the bundle, as it used to. */
export function bootPanels(search: string): { sidebar: number; end: number } | undefined {
  const params = new URLSearchParams(search);
  if (params.get('purpose') !== 'parked') return undefined;
  const sidebar = Number(params.get('sidebar'));
  const end = Number(params.get('end'));
  return Number.isFinite(sidebar) && Number.isFinite(end) && sidebar > 0 && end > 0 ? { sidebar, end } : undefined;
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const panels = bootPanels(window.location.search);
  const root = document.getElementById('root');
  if (panels !== undefined && root !== null) liftWhenRendered(paintBootGround(document, panels), root);
}
