/**
 * Every stacking level the renderer paints at, lowest first. Dialogs, menus, popovers, tooltips and toasts are in the
 * browser's top layer and take no level. `styles.css` mirrors these as `--studio-layer-*`; `layers.test.ts` holds the two together.
 */
export const LAYER = {
  /** Behind the content of its own box, inside that box's stacking context. */
  behind: -1,
  base: 0,
  /** Over its siblings: panels over the canvas, a sticky header over its rows, a pill over its field. */
  raised: 1,
  /** Over a raised sibling. */
  over: 2,
  /** Over both. */
  top: 3,
  /** A hover card or an in-place editor over the surface it belongs to. */
  card: 10,
  /** The count seat over the status rows, which rank themselves below it. */
  seat: 30,
  /** A full-window view in the page, under everything in the top layer. */
  viewer: 100,
  /** Follows the pointer or a drag, over everything else in the page. */
  floating: 1000,
  /** Canvas overlays drawn among the nodes (guides, badges, readouts, measurement) sit above every node's stack rank, a selected one included; the canvas's own stacking context keeps them under the panels. */
  canvasOverlay: 2000,
} as const;

export type LayerName = keyof typeof LAYER;

/** The custom property `styles.css` declares for a level. */
export function layerProperty(name: LayerName): string {
  return `--studio-layer-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}
